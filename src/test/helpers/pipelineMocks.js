import { jest } from '@jest/globals';

export const mockIAMSend = jest.fn();
export const mockLambdaSend = jest.fn();
export const mockAppSyncSend = jest.fn();
export const mockNeptuneSend = jest.fn();
export const mockWriteFileSync = jest.fn();
export const mockReadFileSync = jest.fn();
export class ExitCalled extends Error {
    constructor(code) { super(`process.exit(${code})`); this.code = code; }
}
export const mockExit = jest.fn((code) => { throw new ExitCalled(code); });

export function registerPipelineMocks() {
    jest.unstable_mockModule('@aws-sdk/client-iam', () => ({
        IAMClient: jest.fn(() => ({ send: mockIAMSend })),
        CreateRoleCommand: jest.fn(input => ({ _type: 'CreateRole', input })),
        AttachRolePolicyCommand: jest.fn(input => ({ _type: 'AttachRolePolicy', input })),
        GetRoleCommand: jest.fn(input => ({ _type: 'GetRole', input })),
        CreatePolicyCommand: jest.fn(input => ({ _type: 'CreatePolicy', input })),
        DetachRolePolicyCommand: jest.fn(input => ({ _type: 'DetachRolePolicy', input })),
        DeleteRoleCommand: jest.fn(input => ({ _type: 'DeleteRole', input })),
        DeletePolicyCommand: jest.fn(input => ({ _type: 'DeletePolicy', input })),
    }));

    jest.unstable_mockModule('@aws-sdk/client-lambda', () => ({
        LambdaClient: jest.fn(() => ({ send: mockLambdaSend })),
        CreateFunctionCommand: jest.fn(input => ({ _type: 'CreateFunction', input })),
        GetFunctionCommand: jest.fn(input => ({ _type: 'GetFunction', input })),
        DeleteFunctionCommand: jest.fn(input => ({ _type: 'DeleteFunction', input })),
        UpdateFunctionCodeCommand: jest.fn(input => ({ _type: 'UpdateFunctionCode', input })),
    }));

    jest.unstable_mockModule('@aws-sdk/client-appsync', () => ({
        AppSyncClient: jest.fn(() => ({ send: mockAppSyncSend })),
        CreateGraphqlApiCommand: jest.fn(input => ({ _type: 'CreateGraphqlApi', input })),
        StartSchemaCreationCommand: jest.fn(input => input),
        CreateDataSourceCommand: jest.fn(input => input),
        CreateFunctionCommand: jest.fn(input => input),
        CreateResolverCommand: jest.fn(input => input),
        CreateApiKeyCommand: jest.fn(input => input),
        ListGraphqlApisCommand: jest.fn(input => ({ _type: 'ListGraphqlApis', input })),
        DeleteGraphqlApiCommand: jest.fn(input => ({ _type: 'DeleteGraphqlApi', input })),
        ListResolversCommand: jest.fn(input => input),
    }));

    jest.unstable_mockModule('@aws-sdk/client-neptune', () => ({
        NeptuneClient: jest.fn(() => ({ send: mockNeptuneSend })),
        DescribeDBClustersCommand: jest.fn(input => ({ _type: 'DescribeDBClusters', input })),
        DescribeDBSubnetGroupsCommand: jest.fn(input => ({ _type: 'DescribeDBSubnetGroups', input })),
    }));

    jest.unstable_mockModule('ora', () => ({
        default: jest.fn(() => ({ start: jest.fn().mockReturnThis(), succeed: jest.fn().mockReturnThis(), fail: jest.fn().mockReturnThis(), warn: jest.fn().mockReturnThis() })),
    }));

    jest.unstable_mockModule('fs', () => ({
        default: { writeFileSync: mockWriteFileSync, readFileSync: mockReadFileSync },
    }));

    jest.unstable_mockModule('../zipPackage.js', () => ({
        createLambdaDeploymentPackage: jest.fn(),
    }));

    jest.unstable_mockModule('../logger.js', () => ({
        loggerDebug: jest.fn(), loggerError: jest.fn(), loggerInfo: jest.fn(), yellow: jest.fn(s => s),
    }));

    jest.unstable_mockModule('process', () => ({ exit: mockExit }));
}

export function mockNeptuneClusterResponse({ iamEnabled }) {
    return async (cmd) => {
        if (cmd._type === 'DescribeDBClusters') return {
            DBClusters: [{ Endpoint: 'db.cluster.us-east-1.neptune.amazonaws.com', Port: 8182,
                DBSubnetGroup: 'default', VpcSecurityGroups: [{ VpcSecurityGroupId: 'sg-123' }],
                IAMDatabaseAuthenticationEnabled: iamEnabled, EngineVersion: '1.3.0.0',
                DBClusterArn: 'arn:aws:rds:us-east-1:123:cluster:mydb', DbClusterResourceId: 'cluster-abc' }]
        };
        if (cmd._type === 'DescribeDBSubnetGroups') return {
            DBSubnetGroups: [{ Subnets: [{ SubnetIdentifier: 'subnet-1' }, { SubnetIdentifier: 'subnet-2' }] }]
        };
        return {};
    };
}
