import { jest } from '@jest/globals';
import { mockIAMSend, mockLambdaSend, mockAppSyncSend, registerPipelineMocks } from './helpers/pipelineMocks.js';

registerPipelineMocks();

let removeAWSpipelineResources;

describe('removeAWSpipelineResources', () => {

beforeEach(async () => {
    // Re-import with unique query string to reset module-level mutable state between tests
    ({ removeAWSpipelineResources } = await import('../pipelineResources.js?t=' + Date.now()));
    jest.clearAllMocks();
    mockIAMSend.mockResolvedValue({});
    mockLambdaSend.mockResolvedValue({});
    mockAppSyncSend.mockResolvedValue({});
});

test('should detach Policy1 and Policy2 for neptune-db without IAM', async () => {
    const resources = {
        region: 'us-east-1',
        AppSyncAPI: 'api-id',
        LambdaFunction: 'testLambdaFunction',
        LambdaExecutionRole: 'testLambdaExecutionRole',
        LambdaExecutionPolicy1: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        LambdaExecutionPolicy2: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
        LambdaInvokePolicy: 'arn:invoke-policy',
        LambdaInvokeRole: 'invokeRole',
    };

    await removeAWSpipelineResources(resources, true);

    const detachCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DetachRolePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);

    expect(detachCalls).toContain(resources.LambdaExecutionPolicy1);
    expect(detachCalls).toContain(resources.LambdaExecutionPolicy2);
    expect(detachCalls).not.toContain(undefined);
});

test('should detach all three policies for neptune-db with IAM', async () => {
    const resources = {
        region: 'us-east-1',
        AppSyncAPI: 'api-id',
        LambdaFunction: 'testLambdaFunction',
        LambdaExecutionRole: 'testLambdaExecutionRole',
        LambdaExecutionPolicy1: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        LambdaExecutionPolicy2: 'arn:neptune-query-policy',
        LambdaExecutionPolicy3: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
        NeptuneQueryPolicy: 'arn:neptune-query-policy',
        LambdaInvokePolicy: 'arn:invoke-policy',
        LambdaInvokeRole: 'invokeRole',
    };

    await removeAWSpipelineResources(resources, true);

    const detachCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DetachRolePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);

    expect(detachCalls).toContain(resources.LambdaExecutionPolicy1);
    expect(detachCalls).toContain(resources.LambdaExecutionPolicy2);
    expect(detachCalls).toContain(resources.LambdaExecutionPolicy3);

    const deletePolicyCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DeletePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);
    expect(deletePolicyCalls).toContain(resources.NeptuneQueryPolicy);
});

test('should detach Policy1 and Policy2 for neptune-graph with IAM', async () => {
    const resources = {
        region: 'us-east-1',
        AppSyncAPI: 'api-id',
        LambdaFunction: 'testLambdaFunction',
        LambdaExecutionRole: 'testLambdaExecutionRole',
        LambdaExecutionPolicy1: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        LambdaExecutionPolicy2: 'arn:neptune-query-policy',
        NeptuneQueryPolicy: 'arn:neptune-query-policy',
        LambdaInvokePolicy: 'arn:invoke-policy',
        LambdaInvokeRole: 'invokeRole',
    };

    await removeAWSpipelineResources(resources, true);

    const detachCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DetachRolePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);

    expect(detachCalls).toContain(resources.LambdaExecutionPolicy1);
    expect(detachCalls).toContain(resources.LambdaExecutionPolicy2);
    expect(detachCalls).toHaveLength(3); // Policy1 + Policy2 + InvokePolicy detach
});

test('should handle old resources.json format without Policy3', async () => {
    const resources = {
        region: 'us-east-1',
        AppSyncAPI: 'api-id',
        LambdaFunction: 'testLambdaFunction',
        LambdaExecutionRole: 'testLambdaExecutionRole',
        LambdaExecutionPolicy1: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        LambdaExecutionPolicy2: 'arn:neptune-query-policy',
        NeptuneQueryPolicy: 'arn:neptune-query-policy',
        LambdaInvokePolicy: 'arn:invoke-policy',
        LambdaInvokeRole: 'invokeRole',
    };

    await expect(removeAWSpipelineResources(resources, true)).resolves.not.toThrow();

    const detachCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DetachRolePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);

    expect(detachCalls).toContain(resources.LambdaExecutionPolicy1);
    expect(detachCalls).toContain(resources.LambdaExecutionPolicy2);
    expect(detachCalls).not.toContain(undefined);
});

test('should continue detaching remaining policies when one fails', async () => {
    mockIAMSend.mockImplementation(async (cmd) => {
        if (cmd._type === 'DetachRolePolicy' && cmd.input.PolicyArn === 'arn:policy-that-fails') {
            throw new Error('Detach failed');
        }
        return {};
    });

    const resources = {
        region: 'us-east-1',
        AppSyncAPI: 'api-id',
        LambdaFunction: 'testLambdaFunction',
        LambdaExecutionRole: 'testLambdaExecutionRole',
        LambdaExecutionPolicy1: 'arn:policy-that-fails',
        LambdaExecutionPolicy2: 'arn:policy-that-succeeds',
        LambdaInvokePolicy: 'arn:invoke-policy',
        LambdaInvokeRole: 'invokeRole',
    };

    await expect(removeAWSpipelineResources(resources, true)).resolves.not.toThrow();

    const detachCalls = mockIAMSend.mock.calls
        .filter(([cmd]) => cmd._type === 'DetachRolePolicy')
        .map(([cmd]) => cmd.input.PolicyArn);

    expect(detachCalls).toContain('arn:policy-that-fails');
    expect(detachCalls).toContain('arn:policy-that-succeeds');
});

}); // describe
