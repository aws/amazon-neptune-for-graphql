import { readFileSync } from 'node:fs';
import { loggerInit } from '../logger.js';
import { validatedSchemaModel } from '../schemaModelValidator.js';
import { schemaParser } from '../schemaParser.js';

describe('validatedSchemaModel', () => {
    let model;

    beforeAll(() => {
        loggerInit('./output', false, 'silent');

        const schema = readFileSync('./src/test/directive-id.graphql');
        model = validatedSchemaModel(schemaParser(schema));
    });

    test('should only add _id field to object types without ID fields', () => {
        const objTypeDefs = model.definitions.filter(def => def.kind === 'ObjectTypeDefinition');
        const userType = objTypeDefs.find(def => def.name.value === 'User');
        const groupType = objTypeDefs.find(def => def.name.value === 'Group');

        const userIdFields = getIdFields(userType);
        const groupIdFields = getIdFields(groupType);

        expect(userIdFields).toHaveLength(1);
        expect(groupIdFields).toHaveLength(1);
        expect(userIdFields[0].name.value).toEqual('userId');
        expect(groupIdFields[0].name.value).toEqual('_id');
    });

    test('should define the same ID fields on a type and its input type', () => {
        const typeNames = ['User', 'Group'];

        typeNames.forEach(typeName => {
            const type = model.definitions.find(
                def =>
                    def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
            );
            const inputType = model.definitions.find(
                def =>
                    def.kind === 'InputObjectTypeDefinition' && def.name.value === `${typeName}Input`
            );

            const idFields = getIdFields(type);
            const inputIdFields = getIdFields(inputType);

            expect(idFields).toHaveLength(1);
            expect(inputIdFields).toHaveLength(1);
            expect(idFields[0].name.value).toEqual(inputIdFields[0].name.value);
        });
    });

    function getIdFields(objTypeDef) {
        return objTypeDef.fields.filter(
            field =>
                field.directives.some(directive => directive.name.value === 'id')
        );
    }
});
