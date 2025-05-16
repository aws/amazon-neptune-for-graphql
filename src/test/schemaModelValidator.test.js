import { readFileSync } from 'node:fs';
import { loggerInit } from '../logger.js';
import { validatedSchemaModel } from '../schemaModelValidator.js';
import { schemaParser, schemaStringify } from '../schemaParser.js';

describe('validatedSchemaModel', () => {
    let model;

    beforeAll(() => {
        loggerInit('./output', false, 'silent');

        const schema = readFileSync('./src/test/user-group.graphql');
        model = validatedSchemaModel(schemaParser(schema));
    });

    test('types definitions should be as expected', () => {
        const objectTypes = model.definitions.filter(def => def.kind === 'ObjectTypeDefinition').map(def => def.name.value);
        expect(objectTypes).toEqual(expect.arrayContaining(['User','Group','Moderator','Query', 'Mutation']));
        const inputTypes = model.definitions.filter(def => def.kind === 'InputObjectTypeDefinition').map(def => def.name.value);
        expect(inputTypes).toEqual(expect.arrayContaining(['UserInput','GroupInput','ModeratorInput','Options']));
        const enumTypes = model.definitions.filter(def => def.kind === 'EnumTypeDefinition').map(def => def.name.value);
        expect(enumTypes).toEqual(expect.arrayContaining(['Role']));
    });

    test('should only add _id field to object types without ID fields', () => {
        const objTypeDefs = model.definitions.filter(def => def.kind === 'ObjectTypeDefinition');
        const userType = objTypeDefs.find(def => def.name.value === 'User');
        const groupType = objTypeDefs.find(def => def.name.value === 'Group');
        const moderatorType = objTypeDefs.find(def => def.name.value === 'Moderator');

        expect(userType.fields).toHaveLength(5);
        expect(groupType.fields).toHaveLength(2);
        expect(moderatorType.fields).toHaveLength(4);

        const userIdFields = getIdFields(userType);
        const groupIdFields = getIdFields(groupType);
        const moderatorIdFields = getIdFields(moderatorType);

        expect(userIdFields).toHaveLength(1);
        expect(groupIdFields).toHaveLength(1);
        expect(moderatorIdFields).toHaveLength(1);
        expect(userIdFields[0].name.value).toEqual('userId');
        expect(groupIdFields[0].name.value).toEqual('_id');
        expect(moderatorIdFields[0].name.value).toEqual('moderatorId');
    });

    test('should define the same ID fields on a type and its input type', () => {
        const typeNames = ['User', 'Group', 'Moderator'];

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

    test('should add CreateInput with nullable ID and UpdateInput with non-nullable ID as mutation input types', () => {
        const typeNames = ['User', 'Group'];

        typeNames.forEach(typeName => {
            const createInputType = model.definitions.find(
                def =>
                    def.kind === 'InputObjectTypeDefinition' &&
                    def.name.value === `${typeName}CreateInput`
            );

            const updateInputType = model.definitions.find(
                def =>
                    def.kind === 'InputObjectTypeDefinition' &&
                    def.name.value === `${typeName}UpdateInput`
            );

            expect(createInputType).toBeDefined();
            expect(updateInputType).toBeDefined();

            const createIdField = getIdFields(createInputType)[0];
            const updateIdField = getIdFields(updateInputType)[0];

            expect(createIdField.type.kind).toEqual('NamedType');
            expect(updateIdField.type.kind).toEqual('NonNullType');
        });
    });

    test('should allow enum types as input fields', () => {
        const roleEnumType = model.definitions.find(def => def.kind === 'EnumTypeDefinition' && def.name.value === 'Role');
        expect(roleEnumType.values.map(value => value.name.value)).toEqual(expect.arrayContaining(['USER','ADMIN','GUEST']));

        const userInput = model.definitions.find(def => def.kind === 'InputObjectTypeDefinition' && def.name.value === 'UserInput');
        const userRoleField = userInput.fields.find(field => field.name.value === 'role');
        expect(userRoleField.type.name.value).toEqual('Role');
    });
    
    test('should output expected validated schema', () => {
        const actual = schemaStringify(model, true);
        const expected = readFileSync('./src/test/user-group-validated.graphql', 'utf8')
        expect(actual).toBe(expected); 
    });

    function getIdFields(objTypeDef) {
        return objTypeDef.fields.filter(
            field =>
                field.directives.some(directive => directive.name.value === 'id')
        );
    }
});
