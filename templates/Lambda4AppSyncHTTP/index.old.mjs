import { HttpRequest} from "@aws-sdk/protocol-http"; 
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import async from "async";
import {resolveGraphDBQueryFromAppSyncEvent, refactorGremlinqueryOutput} from './output.resolver.graphql.js';

/*
const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN
  } = process.env;
*/

const LOGGING_ENABLED = true;
let resolver = { query:'', parameters: {}, language: 'opencypher', fieldsAlias: {} };


async function doQuery() {
    if (LOGGING_ENABLED) console.log("In doQuery");

    let result;
    result = await postRequest();    
    
    if (LOGGING_ENABLED) console.log('Query result: ', result);

    let r = null;

    if (resolver.language == 'gremlin') {
        r = JSON.parse(refactorGremlinqueryOutput(result, resolver.fieldsAlias));
    } 

    if (resolver.language == 'opencypher') {
        let data = JSON.parse(result); 
        
        if (data.results.length == 0) {
            return null;
        }
        
        r = data.results[0][Object.keys(data.results[0])[0]];
    }
    
    if (LOGGING_ENABLED) console.log('Response:', r);

    return r;	  
}


const postRequest = async() => {
    if (LOGGING_ENABLED) console.log("Running query:", resolver.query); 

    let postBody ='';
    if (resolver.language == 'opencypher')
        postBody = `query=${encodeURIComponent(resolver.query)}&parameters=${encodeURIComponent(JSON.stringify(resolver.parameters))}`;

    if (resolver.language == 'gremlin')
        postBody = `{"gremlin":"${resolver.query}"}`;

    if (LOGGING_ENABLED) console.log("post body: ", postBody);

    var request = new HttpRequest({
        hostname: process.env.NEPTUNE_HOST,
        port: process.env.NEPTUNE_PORT,
        method: 'POST',
        body: postBody,
        path: resolver.language
    });

    var signer = new SignatureV4({
        credentials: defaultProvider(),
        /*
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            sessionToken: AWS_SESSION_TOKEN,
        },
        */
        region: process.env.AWS_REGION,
        service: 'neptune-db',
        sha256: Sha256
    });

    const iamDbAuthEnabled = (process.env.NEPTUNE_IAM_AUTH_ENABLED === 'true' ? true : false);
    var signedRequest = request;

    if (iamDbAuthEnabled)
        signedRequest = await signer.sign(request);

    if (LOGGING_ENABLED) console.log("signed request: ", signedRequest);
    
    var client = new NodeHttpHandler();

    var { response } = await client.handle(signedRequest);
    let responseBody = '';

    const result = new Promise((resolve, reject) => {        
        response.body.on('data', (chunk) => {
            responseBody += chunk;
        });
        
        response.body.on('end', () => {
            try {
                resolve(responseBody);
            }
            catch (err) {
               reject(new Error(err));
            }
        });
    });

    return result;
};


export const handler = async(event) => {
    if (LOGGING_ENABLED) console.log(event);

    try {
        resolver = resolveGraphDBQueryFromAppSyncEvent(event);
    } catch (err) {
        return {             
            "error": [{ "message": err}]
        };
    }

    if (LOGGING_ENABLED) console.log("Resolver: " + JSON.stringify(resolver));
   
    return async.retry(
    { 
        times: 5,
        interval: 1000,
        errorFilter: function (err) { 
            // Add filters here to determine whether error can be retried
            console.warn('Determining whether retriable error: ' + err.message);

            // Check for ConcurrentModificationException
            if (err.message.includes('ConcurrentModificationException')){
                console.warn('Retrying query because of ConcurrentModificationException');
                return true;
            }

            // Check for ReadOnlyViolationException
            if (err.message.includes('ReadOnlyViolationException')){
                console.warn('Retrying query because of ReadOnlyViolationException');
                return true;
            }
            
            return false; 
        }
    }, 
    doQuery);
};
