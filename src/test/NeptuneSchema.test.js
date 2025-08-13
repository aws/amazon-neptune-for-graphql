import { jest } from '@jest/globals';
import axios from 'axios';
import { loggerInit } from '../logger.js';

describe('Neptune Schema discovery tests', () => {
    beforeAll(() => {
        loggerInit('./src/test/output', true, 'fatal');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should handle nodes with multiple labels when querying edge to and from labels', async () => {
        // Mock successful summary API response
        jest.spyOn(axios, "get").mockResolvedValue({
            data: {
                payload: {
                    graphSummary: {
                        nodeLabels: ['Person', 'Employee', 'Manager', 'Company', 'Developer'],
                        edgeLabels: ['WORKS_FOR', 'REPORTS_TO']
                    }
                }
            }
        });

        // Mock HTTP responses for neptune queries
        const mockResponses = [
            { data: { results: [{ properties: { name: 'John' } }] } },
            { data: { results: [{ properties: { employeeId: 'E123' } }] } },
            { data: { results: [{ properties: { level: 'Senior' } }] } },
            { data: { results: [{ properties: { companyName: 'TechCorp' } }] } },
            { data: { results: [{ properties: { programmingLanguages: 'JavaScript' } }] } },
            { data: { results: [{ properties: { startDate: '2020-01-01' } }] } },
            { data: { results: [{ properties: { since: '2022-01-01' } }] } },
            {
                data: {
                    results: [
                        { fromLabel: ['Employee', 'Person'], toLabel: ['Company'] },
                        { fromLabel: ['Manager', 'Employee'], toLabel: ['Company'] },
                        { fromLabel: ['Developer', 'Employee'], toLabel: ['Company'] }
                    ]
                }
            },
            {
                data: {
                    results: [
                        { fromLabel: ['Employee'], toLabel: ['Manager', 'Person'] },
                        { fromLabel: ['Developer'], toLabel: ['Manager'] }
                    ]
                }
            },
            { data: { results: [] } },
            { data: { results: [] } },
            { data: { results: [] } },
            { data: { results: [{ rels: 3 }] } }
        ];
        mockAxiosResponses(mockResponses);

        // Import the module fresh for each test to avoid state sharing
        const schema = await runGetNeptuneSchema();

        // Validate that no duplicate node or edge structures created
        expect(schema.nodeStructures).toHaveLength(5);
        const nodeLabels = schema.nodeStructures.map(node => node.label).toSorted();
        expect(nodeLabels).toEqual(['Company', 'Developer', 'Employee', 'Manager', 'Person']);

        expect(schema.edgeStructures).toHaveLength(2);
        const edgeLabels = schema.edgeStructures.map(edge => edge.label).sort();
        expect(edgeLabels).toEqual(['REPORTS_TO', 'WORKS_FOR']);
    });

    test('should handle multi-label nodes from getNodesNames query without creating duplicates', async () => {
        // Mock console.error to suppress expected error output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock summary API to fail so we use direct getNodesNames queries
        jest.spyOn(axios, "get").mockRejectedValue(new Error('Summary API not available'));

        // Mock HTTP responses for the multi-label scenario using getNodesNames
        const mockResponses = [
            {
                data: {
                    results: [
                        { 'labels(a)': ['Person', 'Employee'] },
                        { 'labels(a)': ['Person', 'Manager'] },
                        { 'labels(a)': ['Company'] },
                        { 'labels(a)': ['Employee', 'Developer'] },
                        { 'labels(a)': ['Person'] },
                        { 'labels(a)': ['Manager', 'TeamLead'] }
                    ]
                }
            },
            {
                data: {
                    results: [
                        { 'type(e)': 'WORKS_FOR' },
                        { 'type(e)': 'REPORTS_TO' }
                    ]
                }
            },
            { data: { results: [{ properties: { name: 'John', age: 30 } }] } },
            { data: { results: [{ properties: { employeeId: 'E123', department: 'IT' } }] } },
            { data: { results: [{ properties: { level: 'Senior', yearsExperience: 5 } }] } },
            { data: { results: [{ properties: { companyName: 'TechCorp', founded: 2010 } }] } },
            { data: { results: [{ properties: { programmingLanguages: 'JavaScript', seniority: 'Mid' } }] } },
            { data: { results: [{ properties: { teamSize: 8, responsibilities: 'Team coordination' } }] } },
            { data: { results: [{ properties: { startDate: '2020-01-01', position: 'Software Engineer' } }] } },
            { data: { results: [{ properties: { since: '2022-01-01', directReport: true } }] } },
            {
                data: {
                    results: [
                        { fromLabel: ['Employee', 'Person'], toLabel: ['Company'] }
                    ]
                }
            },
            {
                data: {
                    results: [
                        { fromLabel: ['Employee'], toLabel: ['Manager', 'TeamLead'] }
                    ]
                }
            },
            { data: { results: [] } },
            { data: { results: [] } },
            { data: { results: [] } },
            { data: { results: [{ rels: 3 }] } }
        ];
        mockAxiosResponses(mockResponses);

        // Import the module fresh for each test to avoid state sharing
       const schema = await runGetNeptuneSchema();

        // Validate that no duplicate node or edge structures created
        expect(schema.nodeStructures).toHaveLength(6);
        const nodeLabels = schema.nodeStructures.map(node => node.label).sort();
        expect(nodeLabels).toEqual(['Company', 'Developer', 'Employee', 'Manager', 'Person', 'TeamLead']);

        expect(schema.edgeStructures).toHaveLength(2);
        const edgeLabels = schema.edgeStructures.map(edge => edge.label).sort();
        expect(edgeLabels).toEqual(['REPORTS_TO', 'WORKS_FOR']);
    });
});

async function runGetNeptuneSchema() {
    const {getNeptuneSchema, setGetNeptuneSchemaParameters} = await import(`../NeptuneSchema.js?t=${Date.now()}`);
    setNeptuneSchemaParameters(setGetNeptuneSchemaParameters);
    const result = await getNeptuneSchema();
    return JSON.parse(result);
}

function setNeptuneSchemaParameters(setGetNeptuneSchemaParameters) {
    setGetNeptuneSchemaParameters({
        host: 'test-neptune.cluster-abc.us-west-2.neptune.amazonaws.com',
        port: '8182',
        region: 'us-west-2',
        neptuneType: 'neptune-db',
        graphName: 'test-graph',
        domain: 'neptune.amazonaws.com'
    });
}

function mockAxiosResponses(mockResponses = []) {
    let responseIndex = 0;
    jest.spyOn(axios, 'post').mockImplementation(() => {
        if (responseIndex < mockResponses.length) {
            return Promise.resolve(mockResponses[responseIndex++]);
        }
        return Promise.resolve({data: {results: []}});
    });
}