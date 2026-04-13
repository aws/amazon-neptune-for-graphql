import { jest } from '@jest/globals';
import { mockIAMSend, mockLambdaSend, mockAppSyncSend, mockNeptuneSend, mockWriteFileSync, mockReadFileSync, mockExit, ExitCalled, registerPipelineMocks, mockNeptuneClusterResponse } from './helpers/pipelineMocks.js';

registerPipelineMocks();

const originalSetTimeout = globalThis.setTimeout;

let createUpdateAWSpipeline;

beforeEach(async () => {
    globalThis.setTimeout = (fn) => originalSetTimeout(fn, 0);

    ({ createUpdateAWSpipeline } = await import('../pipelineResources.js?t=' + Date.now()));
    jest.clearAllMocks();

    mockIAMSend.mockImplementation(async (cmd) => {
        if (cmd._type === 'GetRole') throw new Error('not found');
        if (cmd._type === 'CreateRole') return { Role: { Arn: 'arn:aws:iam::123:role/testRole' } };
        if (cmd._type === 'CreatePolicy') return { Policy: { Arn: 'arn:aws:iam::123:policy/testPolicy' } };
        return {};
    });
    mockLambdaSend.mockImplementation(async (cmd) => {
        if (cmd._type === 'GetFunction') throw new Error('not found');
        if (cmd._type === 'CreateFunction') return { FunctionArn: 'arn:aws:lambda:us-east-1:123:function:test' };
        return {};
    });
    mockAppSyncSend.mockImplementation(async (cmd) => {
        if (cmd._type === 'ListGraphqlApis') return { graphqlApis: [] };
        return { graphqlApi: { apiId: 'api-123' }, apiKey: { id: 'key-1' }, functionConfiguration: { functionId: 'fn-1' }, resolvers: [] };
    });
    mockNeptuneSend.mockImplementation(mockNeptuneClusterResponse({ iamEnabled: true }));
    mockWriteFileSync.mockReturnValue(undefined);
    mockReadFileSync.mockReturnValue(Buffer.from('zip'));
});

const baseParams = {
    pipelineName: 'test', neptuneDBName: 'mydb', neptuneDBregion: 'us-east-1',
    appSyncSchema: 'type Query { get: String }', lambdaFilesPath: '/tmp/lambda',
    addMutations: false, quietI: true, __dirname: '/tmp',
    neptuneHost: 'db.cluster.us-east-1.neptune.amazonaws.com', neptunePort: '8182',
    outputFolderPath: '/tmp/output', resolverFilePath: '/tmp/r.js', resolverSchemaFilePath: '/tmp/s.json',
    schemaModel: { definitions: [{ kind: 'ObjectTypeDefinition', name: { value: 'Query' }, fields: [{ name: { value: 'get' } }] }] },
};

describe('createLambdaRole via createUpdateAWSpipeline', () => {
    test('should attach VPC role as Policy2 for neptune-db without IAM', async () => {
        mockNeptuneSend.mockImplementation(mockNeptuneClusterResponse({ iamEnabled: false }));

        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-db' });

        const attachCalls = mockIAMSend.mock.calls.filter(([c]) => c._type === 'AttachRolePolicy').map(([c]) => c.input.PolicyArn);
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole');
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');
        const createPolicyCalls = mockIAMSend.mock.calls.filter(([c]) => c._type === 'CreatePolicy');
        const neptuneQueryPolicies = createPolicyCalls.filter(([c]) => c.input.PolicyName?.includes('NeptuneQuery'));
        expect(neptuneQueryPolicies).toHaveLength(0);

        const writes = mockWriteFileSync.mock.calls.map(([, json]) => JSON.parse(json));
        const merged = Object.assign({}, ...writes);
        expect(merged.LambdaExecutionPolicy2).toBe('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');
        expect(merged.LambdaExecutionPolicy3).toBeUndefined();
    });

    test('should attach IAM query as Policy2 and VPC as Policy3 for neptune-db with IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' });

        const attachCalls = mockIAMSend.mock.calls.filter(([c]) => c._type === 'AttachRolePolicy').map(([c]) => c.input.PolicyArn);
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole');
        expect(attachCalls).toContain('arn:aws:iam::123:policy/testPolicy');
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');

        const writes = mockWriteFileSync.mock.calls.map(([, json]) => JSON.parse(json));
        const merged = Object.assign({}, ...writes);
        expect(merged.LambdaExecutionPolicy2).toBe('arn:aws:iam::123:policy/testPolicy');
        expect(merged.LambdaExecutionPolicy3).toBe('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');
        expect(merged.NeptuneQueryPolicy).toBe('arn:aws:iam::123:policy/testPolicy');

        const createPolicyCall = mockIAMSend.mock.calls.find(([c]) => c._type === 'CreatePolicy');
        const policyDoc = JSON.parse(createPolicyCall[0].input.PolicyDocument);
        expect(policyDoc.Statement[0].Action).toContain('neptune-db:connect');
    });

    test('should attach IAM query as Policy2 with no VPC for neptune-graph with IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-graph' });

        const attachCalls = mockIAMSend.mock.calls.filter(([c]) => c._type === 'AttachRolePolicy').map(([c]) => c.input.PolicyArn);
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole');
        expect(attachCalls).toContain('arn:aws:iam::123:policy/testPolicy');
        expect(attachCalls).not.toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');

        const createPolicyCall = mockIAMSend.mock.calls.find(([c]) => c._type === 'CreatePolicy');
        const policyDoc = JSON.parse(createPolicyCall[0].input.PolicyDocument);
        expect(policyDoc.Statement[0].Action).toContain('neptune-graph:connect');
    });

    test('should attach only basic execution role for neptune-graph without IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-graph' });

        const attachCalls = mockIAMSend.mock.calls.filter(([c]) => c._type === 'AttachRolePolicy').map(([c]) => c.input.PolicyArn);
        expect(attachCalls).toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole');
        expect(attachCalls).not.toContain('arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');
        expect(attachCalls).toHaveLength(2); // basic + invoke policy
    });
});

describe('createLambdaFunction VpcConfig via createUpdateAWSpipeline', () => {
    test('should include VpcConfig for neptune-db without IAM', async () => {
        mockNeptuneSend.mockImplementation(mockNeptuneClusterResponse({ iamEnabled: false }));

        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-db' });

        const createFnCall = mockLambdaSend.mock.calls.find(([c]) => c._type === 'CreateFunction');
        expect(createFnCall).toBeDefined();
        expect(createFnCall[0].input.VpcConfig).toBeDefined();
        expect(createFnCall[0].input.VpcConfig.SecurityGroupIds).toEqual(['sg-123']);
        expect(createFnCall[0].input.VpcConfig.SubnetIds).toEqual(['subnet-1', 'subnet-2']);
    });

    test('should include VpcConfig for neptune-db with IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' });

        const createFnCall = mockLambdaSend.mock.calls.find(([c]) => c._type === 'CreateFunction');
        expect(createFnCall[0].input.VpcConfig).toBeDefined();
        expect(createFnCall[0].input.VpcConfig.SubnetIds).toEqual(['subnet-1', 'subnet-2']);
    });

    test('should not include VpcConfig for neptune-graph with IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-graph' });

        const createFnCall = mockLambdaSend.mock.calls.find(([c]) => c._type === 'CreateFunction');
        expect(createFnCall[0].input.VpcConfig).toBeUndefined();
    });

    test('should not include VpcConfig for neptune-graph without IAM', async () => {
        await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-graph' });

        const createFnCall = mockLambdaSend.mock.calls.find(([c]) => c._type === 'CreateFunction');
        expect(createFnCall[0].input.VpcConfig).toBeUndefined();
    });
});

describe('createUpdateAWSpipeline error handling', () => {
    test('should exit on cluster info failure for neptune-db with IAM', async () => {
        mockNeptuneSend.mockRejectedValue(new Error('cluster not found'));

        try { await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }

        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should exit when neptune-db has IAM disabled but flag was provided', async () => {
        mockNeptuneSend.mockImplementation(mockNeptuneClusterResponse({ iamEnabled: false }));

        try { await createUpdateAWSpipeline({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }

        expect(mockExit).toHaveBeenCalledWith(1);
    });
});

afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
});


