/*
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at
    http://www.apache.org/licenses/LICENSE-2.0
or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

import { readFileSync} from 'fs';
import { loggerError } from "./logger.js";

function resolverJS (schemaModel, queryLanguage, queryClient, __dirname) {
    let code = '';
    const queryDataModelJSON = JSON.stringify(schemaModel, null, 2);
    
    if (queryLanguage == 'opencypher') {
        try {
            code = readFileSync(__dirname + '/../templates/JSResolverOCHTTPSTemplate.mjs');
            code = code.toString().replace('TIMESTAMP HERE', (new Date()).toISOString());
            code = code.toString().replace('INSERT SCHEMA DATA MODEL HERE', queryDataModelJSON);
        } catch (err) {
            loggerError('No resolver template found.', err);
        }
    }
    return code;
}


export { resolverJS };