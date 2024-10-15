import {graphDBInferenceSchema} from '../graphdb.js';

const SCHEMA_WITH_PROPERTY_AND_EDGE_SAME_NAME = {
    "nodeStructures": [
        {
            "label": "continent",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "code",
                    "type": "String"
                },
                {
                    "name": "desc",
                    "type": "String"
                },
                {
                    "name": "commonName",
                    "type": "String"
                }
            ]
        },
        {
            "label": "country",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "code",
                    "type": "String"
                },
                {
                    "name": "desc",
                    "type": "String"
                }
            ]
        }
    ],
        "edgeStructures": [
        {
            "label": "contains",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        },
        {
            "label": "commonName",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        }
    ]
};

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(JSON.stringify(SCHEMA_WITH_PROPERTY_AND_EDGE_SAME_NAME), false)).toContain('_commonName:Commonname');
});
