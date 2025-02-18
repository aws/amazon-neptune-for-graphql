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

import { astFromValue, buildASTSchema, typeFromAST } from 'graphql';
import { gql } from 'graphql-tag'; // GraphQL library to parse the GraphQL query

const useCallSubquery = false;

// 2025-02-11T06:24:58.419Z

const schemaDataModelJSON = `{
  "kind": "Document",
  "definitions": [
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Continent"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "continent",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "airportContainssOut"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Airport"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "contains",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "OUT"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "contains"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Contains"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "ContinentInput"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "id"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "ID"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Country"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "country",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "airportContainssOut"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Airport"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "contains",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "OUT"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "contains"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Contains"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "CountryInput"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "ID"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Version"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "version",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "date"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "author"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "VersionInput"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "ID"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "date"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "author"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Airport"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "airport",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "country"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "longest"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "city"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "elev"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "icao"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "lon"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Float"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "runways"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "region"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "lat"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Float"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "desc2"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "alias"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "property"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "desc",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "outboundRoutesCount"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "MATCH (this)-[r:route]->(a) RETURN count(r)",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "continentContainsIn"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Continent"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "contains",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "IN"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "countryContainsIn"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Country"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "contains",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "IN"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "airportRoutesOut"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Airport"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "route",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "OUT"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "airportRoutesIn"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Airport"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "relationship"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "edgeType"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "route",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "direction"
                  },
                  "value": {
                    "kind": "EnumValue",
                    "value": "IN"
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "contains"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Contains"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "route"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Route"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "AirportInput"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "ID"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "country"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "longest"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "code"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "city"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "elev"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "icao"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "lon"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Float"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "runways"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "region"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "type"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "lat"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Float"
            }
          },
          "directives": []
        },
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "desc"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Contains"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "contains",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Route"
      },
      "interfaces": [],
      "directives": [
        {
          "kind": "Directive",
          "name": {
            "kind": "Name",
            "value": "alias"
          },
          "arguments": [
            {
              "kind": "Argument",
              "name": {
                "kind": "Name",
                "value": "property"
              },
              "value": {
                "kind": "StringValue",
                "value": "route",
                "block": false
              }
            }
          ]
        }
      ],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "_id"
          },
          "arguments": [],
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "ID"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": []
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "dist"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "RouteInput"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "dist"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "InputObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Options"
      },
      "directives": [],
      "fields": [
        {
          "kind": "InputValueDefinition",
          "name": {
            "kind": "Name",
            "value": "limit"
          },
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Query"
      },
      "interfaces": [],
      "directives": [],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "code"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "String"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getAirportConnection"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "fromCode"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "String"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "toCode"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "String"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "cypher"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "MATCH (:airport{code: '$fromCode'})-[:route]->(this:airport)-[:route]->(:airport{code:'$toCode'})",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getAirportWithGremlin"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "code"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "String"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "g.V().has('airport', 'code', '$code').elementMap()",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getContinentsWithGremlin"
          },
          "arguments": [],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Continent"
              }
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "g.V().hasLabel('continent').elementMap().fold()",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getCountriesCountGremlin"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "g.V().hasLabel('country').count()",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeContinent"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "ContinentInput"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Continent"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeContinents"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "ContinentInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Continent"
              }
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeCountry"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "CountryInput"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Country"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeCountrys"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "CountryInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Country"
              }
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeVersion"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "VersionInput"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Version"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeVersions"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "VersionInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Version"
              }
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "getNodeAirports"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "filter"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "AirportInput"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "options"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Options"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "ListType",
            "type": {
              "kind": "NamedType",
              "name": {
                "kind": "Name",
                "value": "Airport"
              }
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Mutation"
      },
      "interfaces": [],
      "directives": [],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "createAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "AirportInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "CREATE (this:airport {$input}) RETURN this",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "addRoute"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "fromAirportCode"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "String"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "toAirportCode"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "String"
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "dist"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "Int"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Route"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "MATCH (from:airport{code:'$fromAirportCode'}), (to:airport{code:'$toAirportCode'}) CREATE (from)-[this:route{dist:$dist}]->(to) RETURN this",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "type": {
                "kind": "NamedType",
                "name": {
                  "kind": "Name",
                  "value": "ID"
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Int"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "graphQuery"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "statement"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "MATCH (this:airport) WHERE ID(this) = '$id' DETACH DELETE this",
                    "block": false
                  }
                }
              ]
            }
          ]
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "createNodeContinent"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ContinentInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Continent"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "updateNodeContinent"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ContinentInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Continent"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteNodeContinent"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "createNodeCountry"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "CountryInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Country"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "updateNodeCountry"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "CountryInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Country"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteNodeCountry"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "createNodeVersion"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "VersionInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Version"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "updateNodeVersion"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "VersionInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Version"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteNodeVersion"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "createNodeAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "AirportInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "updateNodeAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "input"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "AirportInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Airport"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteNodeAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "connectNodeContinentToNodeAirportEdgeContains"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Contains"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteEdgeContainsFromContinentToAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "connectNodeCountryToNodeAirportEdgeContains"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Contains"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteEdgeContainsFromCountryToAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "connectNodeAirportToNodeAirportEdgeRoute"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "edge"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "RouteInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Route"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "updateEdgeRouteFromAirportToAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "edge"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "RouteInput"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Route"
            }
          },
          "directives": []
        },
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "deleteEdgeRouteFromAirportToAirport"
          },
          "arguments": [
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "from_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            },
            {
              "kind": "InputValueDefinition",
              "name": {
                "kind": "Name",
                "value": "to_id"
              },
              "type": {
                "kind": "NonNullType",
                "type": {
                  "kind": "NamedType",
                  "name": {
                    "kind": "Name",
                    "value": "ID"
                  }
                }
              },
              "directives": []
            }
          ],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Boolean"
            }
          },
          "directives": []
        }
      ]
    },
    {
      "kind": "SchemaDefinition",
      "directives": [],
      "operationTypes": [
        {
          "kind": "OperationTypeDefinition",
          "operation": "query",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Query"
            }
          }
        },
        {
          "kind": "OperationTypeDefinition",
          "operation": "mutation",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Mutation"
            }
          }
        }
      ]
    }
  ],
  "loc": {
    "start": 0,
    "end": 4903
  }
}`;
    
const schemaDataModel = JSON.parse(schemaDataModelJSON);

const schema = buildASTSchema(schemaDataModel, { assumeValidSDL: true });


/**
 * Resolves a graph db query from a given App Sync graphQL query event.
 *
 * @param {string} event.field the graphQL field being queried
 * @param {object} event.arguments arguments that were passed into the query
 * @param {string} event.selectionSetGraphQL string representation of the graphQL selection set, formatted as GraphQL schema definition language (SDL)
 * @returns {string} the resolved graph db query
 */
export function resolveGraphDBQueryFromAppSyncEvent(event) {
    return resolveGraphDBQueryFromEvent({
        field: event.field,
        arguments: event.arguments,
        selectionSet: gql`${event.selectionSetGraphQL}`.definitions[0].selectionSet
    });
}

/**
 * Resolves a graph db query from a given graphQL query event.
 *
 * @param {string} event.field the graphQL field being queried
 * @param {object} event.arguments arguments that were passed into the query
 * @param {object} event.selectionSet the graphQL AST selection set
 * @returns {string} the resolved graph db query
 */
export function resolveGraphDBQueryFromEvent(event) {
    const fieldDef = getFieldDef(event.field);

    const args = [];
    for (const inputDef of fieldDef.arguments ?? []) {
        const value = event.arguments[inputDef.name.value];

        if (value) {
            const inputType = typeFromAST(schema, inputDef.type);
            args.push({
                kind: 'Argument',
                name: { kind: 'Name', value: inputDef.name.value },
                value: astFromValue(value, inputType)
            });
        }
    }

    const fieldNode = {
        kind: 'Field',
        name: { kind: 'Name', value: event.field },
        arguments: args,
        selectionSet: event.selectionSet
    };
    const obj = {
        kind: 'Document',
        definitions: [
            {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [fieldNode]
                }
            }
        ]
    };

    const graphQuery = resolveGraphDBQuery(obj);
    return graphQuery;
}
    
const matchStatements = []; // openCypher match statements
const withStatements = [];  // openCypher with statements
const returnString = [];    // openCypher return statements
let parameters = {};      // openCypher query parameters
 

function getRootTypeDefs() {
    return getTypeDefs(['Query', 'Mutation']);
}


function getTypeDefs(typeNameOrNames) {
    if (!Array.isArray(typeNameOrNames)) {
        typeNameOrNames = [typeNameOrNames];
    }

    return schemaDataModel.definitions.filter(
        def => def.kind === 'ObjectTypeDefinition' && typeNameOrNames.includes(def.name.value)
    );
}


function getFieldDef(fieldName) {
    const rootTypeDefs = getRootTypeDefs();

    for (const rootDef of rootTypeDefs) {
        const fieldDef = rootDef.fields.find(def => def.name.value === fieldName);

        if (fieldDef) {
            return fieldDef;
        }
    }
}


function getTypeAlias(typeName) {
    let alias = null;
    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value == typeName) {
                if (def.directives.length > 0) {
                    def.directives.forEach(directive => {
                        if (directive.name.value === 'alias') {
                            alias = directive.arguments[0].value.value;
                        }
                    });
                }
            }
        }
    });

    if (alias == null)
        return typeName
    else
        return alias;
}

function getSchemaInputTypeArgs (inputType, schemaInfo) {
    
    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'InputObjectTypeDefinition') {
            if (def.name.value == inputType) {
                def.fields.forEach(field => {
                    let arg = {name: '', type:''};                    
                    let alias = null;
                    
                    arg.name = field.name.value;

                    if (field.type.kind === 'ListType') {
                        arg.type = field.type.type.name.value;
                    }

                    if (field.type.kind === 'NamedType') {
                        arg.type = field.type.name.value;                    
                    }
                    
                    if (field.type.kind === 'NonNullType') {    
                        arg.type = field.type.type.name.value;                                 
                    }

                    if (field.directives.length > 0) {
                        field.directives.forEach(directive => {
                            if (directive.name.value === 'alias') {
                                alias = directive.arguments[0].value.value;
                            }
                            if (directive.name.value === 'id') {
                                schemaInfo.graphDBIdArgName = arg.name;
                            }
                        });
                    }

                    if (alias != null)
                        Object.assign(arg, {alias: alias});
                                        
                        schemaInfo.args.push(arg);
                });            
            }
        }
    });   
}
  
  
function getSchemaQueryInfo(name) {
    const r = {
        type: '', // rename functionType
        name: name,
        returnType: '',
        returnTypeAlias: '',
        pathName: '',
        returnIsArray: false,
        graphQuery: null,
        args: [],
        graphDBIdArgName: '',
        argOptionsLimit: null,
        argOptionsOffset: null,
        argOptionsOrderBy: null,
    };

    schemaDataModel.definitions.forEach(def => {
        if (def.kind != 'ObjectTypeDefinition') {
            return;
        }
        
        if (!(def.name.value === 'Query' || def.name.value === 'Mutation')) {
            return;
        }            

        def.fields.forEach(field => {
            if (field.name.value != name) {
                return;
            }

            r.type = def.name.value;
            r.name = field.name.value;
                        
            // Return type              
            if (field.type.kind === 'ListType') {
                r.returnIsArray = true;
                r.returnType = field.type.type.name.value; 
            }

            if (field.type.kind === 'NamedType') {
                r.returnIsArray = false;
                r.returnType = field.type.name.value;
            }

            if (field.type.kind === 'NonNullType') {                
                if (field.type.type.kind === 'NamedType') {
                    r.returnIsArray = false;
                    r.returnType = field.type.type.name.value;
                }                
            }
            
            r.returnTypeAlias = getTypeAlias(r.returnType);              
            r.pathName = r.name + '_' + r.returnType;
            
            // graphQuery
            if (field.directives.length > 0) {
                field.directives.forEach(directive => {
                    if (directive.name.value === 'graphQuery' || directive.name.value === 'Cypher' || directive.name.value === 'cypher')
                        r.graphQuery = directive.arguments[0].value.value;
                });
            }
            
            // args
            if (field.arguments.length > 0) {
                field.arguments.forEach(arg => {
                    if (arg.type.kind === 'NamedType') {
                        getSchemaInputTypeArgs(arg.type.name.value, r);
                    } else if (arg.type.kind === 'NonNullType') {
                        getSchemaInputTypeArgs(arg.type.type.name.value, r);
                    } else if (arg.type.type.name.value === 'String' || arg.type.type.name.value === 'Int' || arg.type.type.name.value === 'ID') {
                        r.args.push({name: arg.name.value, type: arg.type.type.name.value});
                    } else {
                    // GraphQL type input                        
                    }                   
                });
            }
        });
                
    });

    if (r.returnType == '') {
        console.error('GraphQL query not found.');

    }

    return r;
}
  
  
function getSchemaTypeInfo(lastTypeName, typeName, pathName) {
    const r = {
        name: typeName,
        type: '',
        typeAlias: '',
        pathName: pathName + '_' + typeName,
        isArray: false,
        isRelationship: false,
        relationship: {edgeType: '', direction: 'IN'},
        graphQuery: null
    };

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === lastTypeName) {
                def.fields.forEach(field => {
                    if (field.name.value === typeName) {
                        // isArray
                        if (field.type.kind === 'ListType') {
                            r.isArray = true;
                            r.type = field.type.type.name.value;
                        }
                        if (field.type.kind === 'NamedType') {
                            r.isArray = false;
                            r.type = field.type.name.value;
                        }
                        // isRelationship
                        if (field.directives.length > 0) {
                            field.directives.forEach(directive => {
                                if (directive.name.value === 'relationship') {
                                    r.isRelationship = true;
                                    directive.arguments.forEach(arg => {
                                        if (arg.name.value === 'type' || arg.name.value === 'edgeType') {
                                            r.relationship.edgeType = arg.value.value;
                                        }
                                        if (arg.name.value === 'direction') {
                                            r.relationship.direction = arg.value.value;
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            
            }
        }
    });

    r.typeAlias = getTypeAlias(r.type);

    return r;
}
  
  
function getSchemaFieldInfo(typeName, fieldName, pathName) {
    const r = { 
        name: fieldName,
        alias: '',
        type: '',
        isSchemaType: false,
        pathName: '',
        isId: false,
        isArray: false,
        isRequired: false,   
        graphQuery: null,
        relationship: null,
        args:[],
        graphDBIdArgName: '',
        argOptionsLimit: null,
        argOptionsOffset: null,
        argOptionsOrderBy: null,
    }

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === typeName) {
                def.fields.forEach(field => {
                    if (field.name.value === fieldName) {
                        r.name = field.name.value;
                        r.alias = r.name;                        
                        if (field.type.kind === 'ListType') {
                            r.isArray = true;
                            r.type = field.type.type.name.value;
                        }
                        if (field.type.kind === 'NamedType') {
                            r.isArray = false;
                            r.type = field.type.name.value;    
                        }
                        if (field.type.kind === 'NonNullType') {
                            r.isArray = false;
                            r.type = field.type.type.name.value;
                        }
                        r.pathName = pathName + '_' + r.name;
                        if (field.directives.length > 0) {
                            field.directives.forEach(directive => {
                                if (directive.name.value === 'alias') {
                                    r.alias = directive.arguments[0].value.value;
                                }                                
                                if (directive.name.value === 'graphQuery' || directive.name.value === 'Cypher' || directive.name.value === 'cypher') {
                                    r.graphQuery = directive.arguments[0].value.value;
                                    if (fieldName == 'id') { 
                                        r.graphQuery = r.graphQuery.replace(' as id', '');
                                        r.graphQuery = r.graphQuery.replace(' AS id', '');
                                    }                 
                                }
                                if (directive.name.value === 'id')
                                    r.graphDBIdArgName = r.name;
                            });
                        }

                        if (field.arguments.length > 0) {
                            field.arguments.forEach(arg => {
                                if (arg.type.kind === 'NamedType') {
                                    getSchemaInputTypeArgs(arg.type.name.value, r);
                                } else if (arg.type.kind === 'NonNullType') {
                                    getSchemaInputTypeArgs(arg.type.type.name.value, r);
                                } else if (arg.type.type.name.value === 'String' || arg.type.type.name.value === 'Int' || arg.type.type.name.value === 'ID') {
                                    r.args.push({name: arg.name.value, type: arg.type.type.name.value});
                                } else {
                                // GraphQL type input                        
                                }                   
                            });
                        }

                    }
                });
            
            }
        }
    });
    
    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === r.type) {
                r.isSchemaType = true;
            }
        }
    }); 

    if (r.type == '') {
        console.error('GraphQL field not found.');
    }

    return r;
}


function getOptionsInSchemaInfo(fields, schemaInfo) {
    fields.forEach( field => {
        if (field.name.value == 'limit') {            
            schemaInfo.argOptionsLimit = field.value.value;
        }
        /* TODO        
        if (field.name.value == 'offset') {            
            schemaInfo.argOptionsOffset = field.value.value;
        }
        if (field.name.value == 'orderBy') {            
            schemaInfo.argOptionsOrderBy = field.value.value;
        }
        */        
    });    
}

  
function createQueryFunctionMatchStatement(obj, matchStatements, querySchemaInfo) {        
    if (querySchemaInfo.graphQuery != null) {
        var gq = querySchemaInfo.graphQuery.replaceAll('this', querySchemaInfo.pathName);
        obj.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
            gq = gq.replace('$' + arg.name.value, arg.value.value);
        });
                
        matchStatements.push(gq);
            
    } else {

        let { queryArguments, where } = getQueryArguments(obj.definitions[0].selectionSet.selections[0].arguments, querySchemaInfo);
        
        if  (queryArguments.length > 0) {
            matchStatements.push(`MATCH (${querySchemaInfo.pathName}:\`${querySchemaInfo.returnTypeAlias}\`{${queryArguments}})${where}`);
        } else {
            matchStatements.push(`MATCH (${querySchemaInfo.pathName}:\`${querySchemaInfo.returnTypeAlias}\`)${where}`);
        }

        if (querySchemaInfo.argOptionsLimit != null)
            matchStatements.push(`WITH ${querySchemaInfo.pathName} LIMIT ${querySchemaInfo.argOptionsLimit}`);
    }

    withStatements.push({carryOver: querySchemaInfo.pathName, inLevel:'', content:''});
}


function getQueryArguments(args, querySchemaInfo) {
    let where = '';
    let queryArguments = '';    
    args.forEach(arg => {
        if (arg.name.value == 'filter') {
            let inputFields = transformFunctionInputParameters(arg.value.fields, querySchemaInfo);
            queryArguments = queryArguments + inputFields.fields + ",";

            if (inputFields.graphIdValue != null) {                
                let param = querySchemaInfo.pathName + '_' + 'whereId';
                Object.assign(parameters, { [param]: inputFields.graphIdValue });
                where = ` WHERE ID(${querySchemaInfo.pathName}) = $${param}`;
            }

        } else if (arg.name.value == 'options') {
            if (arg.value.kind === 'ObjectValue')
                getOptionsInSchemaInfo(arg.value.fields, querySchemaInfo);
        } else {
            queryArguments = queryArguments + arg.name.value + ":'" + arg.value.value + "',";
        }
    });
    queryArguments = queryArguments.substring(0, queryArguments.length - 1);
    return { queryArguments, where };
}


function extractTextBetweenParentheses(str) {
    const match = str.match(/\(([^)]+)\)/);
    return match ? match[1] : ''; // Returns the content between the parentheses
}


function modifyVariableNames(query, name) {
    return query.replace(/\b(\w+)\b/g, function (match, p1, offset, string) {
      // Check if the matched word is preceded by '(', '[', '[:', or '(:'
      if (
        string[offset - 1] === '(' ||
        string[offset - 1] === '[' ||
        (string[offset - 2] === '[' && string[offset - 1] === ':') ||
        (string[offset - 2] === '(' && string[offset - 1] === ':')
      ) {
        return name + '_' + p1;
      }
      return match;
    });
  }


function graphQueryRefactoring(lastNamePath, fieldSchemaInfo) {
    const r = { queryMatch:'', returnCarryOver: '', inLevel : '', returnAggregation: ''}    
    const name = lastNamePath + '_' + fieldSchemaInfo.name;
    
    const statementParts = fieldSchemaInfo.graphQuery.split(' RETURN ');
    const returnStatement = statementParts[1];
    r.queryMatch = statementParts[0];
    
    r.queryMatch = modifyVariableNames(r.queryMatch, name);    
    r.queryMatch = r.queryMatch.replace(name +'_this', lastNamePath);

    let returningName = '';
    let isAggregation = false;

    //check if includes aggregating functions 
    if (returnStatement.includes('(')) {
        returningName = extractTextBetweenParentheses(returnStatement);
        isAggregation = true;
    } else {
        returningName = returnStatement;        
    }

    if (isAggregation) {
        r.returnAggregation = returnStatement.replace(returningName, name + '_' + returningName);
        r.inLevel = name;
        r.returnCarryOver = name + '_' + returningName;
    } else {
        r.returnCarryOver = name + '_' + returningName;
    }

    return r;
}

  
function createQueryFieldMatchStatement(fieldSchemaInfo, lastNamePath) {
    // solution until CALL subquery is supported in Neptune openCypher
    
    const refactored = graphQueryRefactoring(lastNamePath, fieldSchemaInfo);

    if (refactored.queryMatch.toUpperCase().includes('MATCH'))
        refactored.queryMatch = 'OPTIONAL ' + refactored.queryMatch;            
    matchStatements.push(refactored.queryMatch);

    if ( refactored.returnAggregation != '' ) {
        const thisWithId = withStatements.push({carryOver: refactored.returnCarryOver, inLevel: '', content: `${refactored.returnAggregation} AS ${refactored.inLevel}`}) -1;        
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));        
        
        withStatements[i].content += refactored.inLevel;

        for (let p = thisWithId -1; p > i; p--) {          
            withStatements[p].inLevel += refactored.inLevel + ', ';
        }

    } else {
        // no new with, just add it to lastnamepath content
        // maybe not needed
    }
        
}


function createQueryFieldLeafStatement(fieldSchemaInfo, lastNamePath) {      
    
    let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));
    
    if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{' && withStatements[i].content != '' )
        withStatements[i].content += ', ';
    
    withStatements[i].content += fieldSchemaInfo.name + ':';

    if (fieldSchemaInfo.graphDBIdArgName === fieldSchemaInfo.name && fieldSchemaInfo.graphQuery == null) {          
        withStatements[i].content += 'ID(' + lastNamePath + ')';
    } else {
    
        if (fieldSchemaInfo.graphQuery !=null ) {
            if (useCallSubquery) {
                matchStatements.push(` CALL { WITH ${lastNamePath} ${fieldSchemaInfo.graphQuery.replaceAll('this', lastNamePath)} AS ${lastNamePath + '_' + fieldSchemaInfo.name} }`);                  
                withStatements[i].content += ' ' + lastNamePath + '_' + fieldSchemaInfo.name;
            } else {
                createQueryFieldMatchStatement(fieldSchemaInfo, lastNamePath);
            }
        } else {              
            withStatements[i].content += ' ' + lastNamePath + '.' + `\`${fieldSchemaInfo.alias}\``;
        }
    }        
}
  
  
function createTypeFieldStatementAndRecurse(e, fieldSchemaInfo, lastNamePath, lastType) {
    const schemaTypeInfo = getSchemaTypeInfo(lastType, fieldSchemaInfo.name, lastNamePath);
    
    // check if the field has is a function with parameters, look for filters and options
    if (e.arguments !== undefined) {
        e.arguments.forEach(arg => {
            if (arg.value.kind === 'ObjectValue' && arg.name.value === 'options')
                getOptionsInSchemaInfo(arg.value.fields, fieldSchemaInfo);
        });
    }
   

    let { queryArguments, where } = getQueryArguments(e.arguments, fieldSchemaInfo);
    if (queryArguments != '')
        queryArguments = '{' + queryArguments + '}';


    if (schemaTypeInfo.isRelationship) {        
        if (schemaTypeInfo.relationship.direction === 'IN') {
            matchStatements.push(`OPTIONAL MATCH (${lastNamePath})<-[${schemaTypeInfo.pathName}_${schemaTypeInfo.relationship.edgeType}:${schemaTypeInfo.relationship.edgeType}]-(${schemaTypeInfo.pathName}:\`${schemaTypeInfo.typeAlias}\`${queryArguments})`);
        } else {
            matchStatements.push(`OPTIONAL MATCH (${lastNamePath})-[${schemaTypeInfo.pathName}_${schemaTypeInfo.relationship.edgeType}:${schemaTypeInfo.relationship.edgeType}]->(${schemaTypeInfo.pathName}:\`${schemaTypeInfo.typeAlias}\`${queryArguments})`);
        }
    } 
    const thisWithId = withStatements.push({carryOver: schemaTypeInfo.pathName, inLevel: '', content: ''}) - 1;

    if (schemaTypeInfo.isArray) {        
        withStatements[thisWithId].content += 'collect(';
    }
    
    withStatements[thisWithId].content += '{';
    selectionsRecurse(e.selectionSet.selections, schemaTypeInfo.pathName, schemaTypeInfo.type);        
    withStatements[thisWithId].content += '}';
  
    if (schemaTypeInfo.isArray) {
        if (fieldSchemaInfo.argOptionsLimit != null) {                            
            withStatements[thisWithId].content += `)[..${fieldSchemaInfo.argOptionsLimit}] AS ${schemaTypeInfo.pathName}_collect`;
        } else {
            withStatements[thisWithId].content += ') AS ' + schemaTypeInfo.pathName + '_collect';
        }
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));
        
        if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{')
            withStatements[i].content += ', ';    

        withStatements[i].content += schemaTypeInfo.name + ': ' + schemaTypeInfo.pathName + '_collect';
                
        for (let p = thisWithId -1; p > i; p--) {          
            withStatements[p].inLevel += schemaTypeInfo.pathName + '_collect, ';
        }
          
    } else {        
        withStatements[thisWithId].content += ' AS ' + schemaTypeInfo.pathName + '_one';        
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));

        if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{')
            withStatements[i].content += ', ';
        
        withStatements[i].content += schemaTypeInfo.name + ': ' + schemaTypeInfo.pathName + '_one';
                
        for (let p = thisWithId -1; p > i; p--) {          
            withStatements[p].inLevel += schemaTypeInfo.pathName + '_one, ';
        }
    }
    
}
  
  
function selectionsRecurse(s, lastNamePath, lastType) {
        
    s.forEach(e => {
        
        const fieldSchemaInfo = getSchemaFieldInfo(lastType, e.name.value, lastNamePath);

        // check if is schema type
        if (!fieldSchemaInfo.isSchemaType) {             
            createQueryFieldLeafStatement(fieldSchemaInfo, lastNamePath);            
            // exit terminating recursion branch
            return
        }
        
        createTypeFieldStatementAndRecurse(e, fieldSchemaInfo, lastNamePath, lastType)                          
    });    
};
    
    
function finalizeGraphQuery(matchStatements, withStatements, returnString) {
    // make a string out of match statements
    let ocMatchStatements = '';
    matchStatements.forEach(e => {
        ocMatchStatements += e + '\n';
    });
    ocMatchStatements = ocMatchStatements.substring(0, ocMatchStatements.length - 1);
    
    let ocWithStatements = '';
    let carryOvers = '';
    let withToReverse = [];
    for (let i = 1; i < withStatements.length; i++) {        
        carryOvers += withStatements[i - 1].carryOver + ', ';
        withToReverse.push('\n' + 'WITH ' + carryOvers + withStatements[i].inLevel + withStatements[i].content);        
    }

    for(let i = withToReverse.length - 1; i >= 0; i--) {
        ocWithStatements += withToReverse[i];
    }
    
    // make a string out of return statement
    let ocReturnStatement = '';
    returnString.forEach(e => {
        ocReturnStatement = ocReturnStatement + e;    
    });

    // make the oc query string
    return ocMatchStatements + ocWithStatements + '\nRETURN ' + ocReturnStatement;
}
    
  
function resolveGrapgDBqueryForGraphQLQuery (obj, querySchemaInfo) {
                          
    createQueryFunctionMatchStatement(obj, matchStatements, querySchemaInfo);
    
    // start processing the given query
    if (querySchemaInfo.returnIsArray) {
        returnString.push('collect(');
    }        
    
    withStatements[0].content = '{';
    
    selectionsRecurse(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo.pathName, querySchemaInfo.returnType);
    
    if (withStatements[0].content.slice(-2) == ', ')
        withStatements[0].content = withStatements[0].content.substring(0, withStatements[0].content.length - 2);

    withStatements[0].content += '}';
    
    returnString.push(withStatements[0].content);
        
    if (querySchemaInfo.returnIsArray) {
        returnString.push(')');
        if (querySchemaInfo.argOptionsLimit != null)
            //returnString.push(` LIMIT ${querySchemaInfo.argOptionsLimit}`);
            returnString.push(`[..${querySchemaInfo.argOptionsLimit}]`);
    } else {
        returnString.push(' LIMIT 1');   
    }
    
    return finalizeGraphQuery(matchStatements, withStatements, returnString);
}
  
  
function transformFunctionInputParameters(fields, schemaInfo) {
    let r = { fields:'', graphIdValue: null };
    schemaInfo.args.forEach(arg => {
        fields.forEach(field => {
            if (field.name.value === arg.name) {
                let value = field.value.value;
                if (field.value.kind === 'IntValue' || field.value.kind === 'FloatValue') {
                    value = Number(value);
                }
                if (arg.name === schemaInfo.graphDBIdArgName) {
                    r.graphIdValue = value
                } else if (arg.alias != null) {
                    let param = schemaInfo.pathName + '_' + arg.alias;
                    r.fields += `${arg.alias}: $${param}, `;
                    Object.assign(parameters, { [param]: value });
                } else  {
                    let param = schemaInfo.pathName + '_' + arg.name;
                    r.fields += `${arg.name}: $${param}, `;
                    Object.assign(parameters, { [param]: value });
                }
            }
        });
    });

    r.fields = r.fields.substring(0, r.fields.length - 2);
    
    return r;
}
  
  
function returnStringOnly(selections, querySchemaInfo) {
    withStatements.push({carryOver: querySchemaInfo.pathName, inLevel:'', content:''});    
    selectionsRecurse(selections, querySchemaInfo.pathName, querySchemaInfo.returnType);
    return `{${withStatements[0].content}}`
}
  
        
function resolveGrapgDBqueryForGraphQLMutation (obj, querySchemaInfo) {
    
    // createNode
    if (querySchemaInfo.name.startsWith('createNode') && querySchemaInfo.graphQuery == null) {
        const inputFields = transformFunctionInputParameters(obj.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let returnBlock = `ID(${nodeName})`;
        if (obj.definitions[0].selectionSet.selections[0].selectionSet != undefined) {        
            returnBlock = returnStringOnly(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
        }
        const ocQuery = `CREATE (${nodeName}:\`${querySchemaInfo.returnTypeAlias}\` {${inputFields.fields}})\nRETURN ${returnBlock}`;
        return ocQuery;
    }
    
    // updateNode
    if (querySchemaInfo.name.startsWith('updateNode') && querySchemaInfo.graphQuery == null) {
        const inputFields = transformFunctionInputParameters(obj.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
        const nodeID = inputFields.graphIdValue;
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let returnBlock = `ID(${nodeName})`;
        if (obj.definitions[0].selectionSet.selections[0].selectionSet != undefined) {        
            returnBlock = returnStringOnly(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
        }
        // :( SET += is not working, so let's work around it.
        //let ocQuery = `MATCH (${nodeName}) WHERE ID(${nodeName}) = '${nodeID}' SET ${nodeName} += {${inputFields}} RETURN ${returnBlock}`;
        // workaround:
        const propertyList = inputFields.fields.split(', ');
        let setString = '';
        propertyList.forEach(property => {
            let kv = property.split(': ');
            setString = setString + ` ${nodeName}.${kv[0]} = ${kv[1]},`;
        });
        setString = setString.substring(0, setString.length - 1);
        let param  = nodeName + '_' + 'whereId';
        Object.assign(parameters, {[param]: nodeID});
        const ocQuery = `MATCH (${nodeName})\nWHERE ID(${nodeName}) = $${param}\nSET ${setString}\nRETURN ${returnBlock}`;
        return ocQuery;
    }
    
    // deleteNode
    if (querySchemaInfo.name.startsWith('deleteNode') && querySchemaInfo.graphQuery == null) {    
        const nodeID = obj.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let param  = nodeName + '_' + 'whereId';
        Object.assign(parameters, {[param]: nodeID});
        const ocQuery = `MATCH (${nodeName})\nWHERE ID(${nodeName}) = $${param}\nDETACH DELETE ${nodeName}\nRETURN true`;
        return ocQuery;
    }
    
    // connect
    if (querySchemaInfo.name.startsWith('connectNode') && querySchemaInfo.graphQuery == null) {
        let fromID = obj.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = obj.definitions[0].selectionSet.selections[0].arguments[1].value.value;
        const edgeType = querySchemaInfo.name.match(new RegExp('Edge' + "(.*)" + ''))[1];
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        const egdgeTypeAlias = getTypeAlias(edgeType);
        const returnBlock = returnStringOnly(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
        
        let paramFromId  = edgeName + '_' + 'whereFromId';
        let paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});

        if (obj.definitions[0].selectionSet.selections[0].arguments.length > 2) {            
            const inputFields = transformFunctionInputParameters(obj.definitions[0].selectionSet.selections[0].arguments[2].value.fields, querySchemaInfo);
            const ocQuery = `MATCH (from), (to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nCREATE (from)-[${edgeName}:\`${egdgeTypeAlias}\`{${inputFields.fields}}]->(to)\nRETURN ${returnBlock}`;
            return ocQuery;
        } else {
            const ocQuery = `MATCH (from), (to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nCREATE (from)-[${edgeName}:\`${egdgeTypeAlias}\`]->(to)\nRETURN ${returnBlock}`;
            return ocQuery;
        }       
    } 
    
    // updateEdge
    if (querySchemaInfo.name.startsWith('updateEdge') && querySchemaInfo.graphQuery == null) {        
        let fromID = obj.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = obj.definitions[0].selectionSet.selections[0].arguments[1].value.value;
        let edgeType = querySchemaInfo.name.match(new RegExp('updateEdge' + "(.*)" + 'From'))[1];
        let egdgeTypeAlias = getTypeAlias(edgeType);
        const inputFields = transformFunctionInputParameters(obj.definitions[0].selectionSet.selections[0].arguments[2].value.fields, querySchemaInfo);
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let returnBlock = `ID(${edgeName})`;
        if (obj.definitions[0].selectionSet.selections[0].selectionSet != undefined) {        
            returnBlock = returnStringOnly(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
        }    
        const propertyList = inputFields.fields.split(', ');
        let setString = '';
        propertyList.forEach(property => {
            let kv = property.split(': ');
            setString = setString + ` ${edgeName}.${kv[0]} = ${kv[1]},`;
        });
        setString = setString.substring(0, setString.length - 1);

        const paramFromId  = edgeName + '_' + 'whereFromId';
        const paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});

        const ocQuery = `MATCH (from)-[${edgeName}:$\`${egdgeTypeAlias}\`]->(to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nSET ${setString}\nRETURN ${returnBlock}`;
        return  ocQuery;
    }
    
    // deleteEdge
    if (querySchemaInfo.name.startsWith('deleteEdge') && querySchemaInfo.graphQuery == null) {
        let fromID = obj.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = obj.definitions[0].selectionSet.selections[0].arguments[1].value.value;   
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;

        const paramFromId  = edgeName + '_' + 'whereFromId';
        const paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});                
        
        const ocQuery = `MATCH (from)-[${edgeName}]->(to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nDELETE ${edgeName}\nRETURN true`;
        return  ocQuery;
    }
            
    // graph query directive
    if (querySchemaInfo.graphQuery != null) {
        
        let ocQuery = querySchemaInfo.graphQuery;
        
        if (ocQuery.includes('$input')) {
            const inputFields = transformFunctionInputParameters(obj.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
            ocQuery = ocQuery.replace('$input', inputFields.fields);
        } else {
            obj.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
                ocQuery = ocQuery.replace('$' + arg.name.value, arg.value.value);
            });
        }
        
        if (ocQuery.includes('RETURN')) {
            const statements = ocQuery.split(' RETURN ');
            const entityName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
            const body = statements[0].replace("this", entityName);
            const returnBlock = returnStringOnly(obj.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
            ocQuery = body + '\nRETURN ' + returnBlock;
        }
        
        return ocQuery;
    }
            
    return '';
}
     
    
function resolveOpenCypherQuery(obj, querySchemaInfo) {
    let ocQuery = '';

    // clear 
    matchStatements.splice(0,matchStatements.length);
    withStatements.splice(0,withStatements.length);
    returnString.splice(0, returnString.length);
    parameters = {};

    if (querySchemaInfo.type === 'Query') {
        ocQuery = resolveGrapgDBqueryForGraphQLQuery(obj, querySchemaInfo);
    }

    if (querySchemaInfo.type === 'Mutation') {
        ocQuery = resolveGrapgDBqueryForGraphQLMutation(obj, querySchemaInfo);
    }
    
    return ocQuery;
}


function gremlinElementToJson(o, fieldsAlias) {
    let data = '';        
    let isKey = true;
    data += '{';
    o['@value'].forEach(v => {
        if (v['@value'] != undefined) {
            if (v['@value'] == 'label')
                data += '"type":';
            if (v['@value'] == 'id') 
                //data += '"id":';
                data += '"' + fieldsAlias["id"] + '":';
            if (v['@type'] == 'g:Int32' || v['@type'] == 'g:Double' || v['@type'] == 'g:Int64')
                data += v['@value'] + ', ';
            isKey = !isKey;            
        } else {
            if (isKey) {
                data += '"' + fieldsAlias[v] + '":';
                isKey = false;
            } else {
                data += '"' + v + '", ';
                isKey = true;
            }
        }
    });
    data = data.substring(0, data.length - 2);
    data += '}';        
    return data;
}


export function refactorGremlinqueryOutput(queryResult, fieldsAlias) {
  
    //const r = JSON.parse(queryResult).result.data;
    const r = queryResult;

    let data = '';
    let isScalar = false;
    let isOneElement = false;
    let isArray = false;

    if (r['@value'].length == 1) {
        if (r['@value'][0]['@type'] == 'g:Map')
            isOneElement = true;
        else if (r['@value'][0]['@type'] == 'g:List')
            isArray = true;
        else
            isScalar = true    
    }    
        
    if (isScalar) {
        data =  r['@value'][0]['@value'];
    } else if (isOneElement) {        
        data += gremlinElementToJson(r['@value'][0], fieldsAlias);
    } else {
        data += '[';

        r['@value'][0]['@value'].forEach(e => {
            try {
                data += gremlinElementToJson(e, fieldsAlias);
                data +=',\n';
            } catch {}
        });
        
        data = data.substring(0, data.length - 2);
        data += ']';
    }

    return data;
}


function getFieldsAlias(typeName) {
    const r = {};

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === typeName) {
                def.fields.forEach(field => {                    
                    let alias = field.name.value;
                    if (field.directives.length > 0) {
                        field.directives.forEach(directive => {
                            if (directive.name.value === 'alias') {
                                alias = directive.arguments[0].value.value;                                
                            }
                            if (directive.name.value === 'id') {
                                alias = 'id';                            
                            }                                                            
                        });
                    }
                    r[alias] = field.name.value;
                });
            
            }
        }
    });

    return r;
}


function resolveGremlinQuery(obj, querySchemaInfo) {
    let gremlinQuery = { 
        query:'', 
        language: 'gremlin',
        parameters: {}, 
        refactorOutput: null, 
        fieldsAlias: getFieldsAlias(querySchemaInfo.returnType) };

    // replace values from input parameters
    gremlinQuery.query = querySchemaInfo.graphQuery;
    obj.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
        gremlinQuery.query = gremlinQuery.query.replace('$' + arg.name.value, arg.value.value);
    });

    return gremlinQuery;
}


function parseQueryInput(queryObjOrStr) {
    // Backwards compatibility
    if (typeof queryObjOrStr === 'string') {
        return gql(queryObjOrStr);
    }

    // Already in AST format
    return queryObjOrStr;
}


/**
 * Accepts a GraphQL document or query string and outputs the graphDB query.
 *
 * @param {(Object|string)} queryObjOrStr the GraphQL document containing an operation to resolve
 * @returns {string}
 */
export function resolveGraphDBQuery(queryObjOrStr) {
    let executeQuery =  { query:'', parameters: {}, language: 'opencypher', refactorOutput: null };

    const obj = parseQueryInput(queryObjOrStr);

    const querySchemaInfo = getSchemaQueryInfo(obj.definitions[0].selectionSet.selections[0].name.value);

    if (querySchemaInfo.graphQuery != null) {
        if (querySchemaInfo.graphQuery.startsWith('g.V')) {            
            executeQuery.language = 'gremlin'
        }
    }
            
    if (executeQuery.language == 'opencypher') {
        executeQuery.query = resolveOpenCypherQuery(obj, querySchemaInfo);
        executeQuery.parameters = parameters;
    }
     
    if (executeQuery.language == 'gremlin') {
        executeQuery = resolveGremlinQuery(obj, querySchemaInfo);
    }
    
    return executeQuery;
}
