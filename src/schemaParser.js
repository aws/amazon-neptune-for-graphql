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

import { print, visit, parse } from 'graphql';


function schemaParser (schema) {
    return parse(schema);
}

function schemaStringify (schemaModel, directives = true) {
    let r = '';
	if (directives) {
		r = print(schemaModel);
	} else {
		const schemaWithoutDirectives = visit(schemaModel, {
			Directive: () => null,
		});
		const schemaTxt = print(schemaWithoutDirectives);
        r = changeComments(schemaTxt);
        r = addSchemaType(r);   
	}
	return r;
}


function changeComments(schemaTxt) {
    const lines = schemaTxt.split('\n');
    const modifiedLines = lines.map(line => {  
        line = line.replace(/^(\s*)"""/, '$1#');  
        line = line.replace(/"""(\s*)$/, '$1');
        return line;
    });
 
    const r = modifiedLines.join('\n');
    return r;
}


function addSchemaType(schemaTxt) {
    if (!schemaTxt.includes('schema {')) {
        schemaTxt += '\n\nschema {\n  query: Query\n  mutation: Mutation\n}';
    }
    return schemaTxt;
}


export { schemaParser, schemaStringify };
