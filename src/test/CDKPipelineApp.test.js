import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { ExitCalled } from './helpers/pipelineMocks.js';

const cdkTemplateContent = readFileSync('./templates/CDKTemplate.js', 'utf8');

const mockGetNeptuneClusterDbInfoBy = jest.fn();
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();

jest.unstable_mockModule('../pipelineResources.js', () => ({
    getNeptuneClusterDbInfoBy: mockGetNeptuneClusterDbInfoBy,
}));

jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
    writeFile: mockWriteFile,
}));

jest.unstable_mockModule('ora', () => ({
    default: jest.fn(() => ({ start: jest.fn().mockReturnThis(), succeed: jest.fn(), fail: jest.fn(), warn: jest.fn() })),
}));

jest.unstable_mockModule('../zipPackage.js', () => ({
    createLambdaDeploymentPackage: jest.fn(),
}));

jest.unstable_mockModule('../logger.js', () => ({
    loggerDebug: jest.fn(), loggerError: jest.fn(), loggerInfo: jest.fn(), yellow: jest.fn(s => s),
}));

// CDKPipelineApp.js calls process.exit() directly (global), so spyOn is needed here
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code) => { throw new ExitCalled(code); });

let createAWSpipelineCDK;

beforeAll(async () => {
    ({ createAWSpipelineCDK } = await import('../CDKPipelineApp.js'));
});

beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockImplementation(async (path, enc) => {
        if (path.includes('CDKTemplate')) return cdkTemplateContent;
        return '';
    });
    mockWriteFile.mockResolvedValue(undefined);
});

const clusterInfo = {
    host: 'db.cluster.us-east-1.neptune.amazonaws.com', port: '8182',
    isIAMauth: true, version: '1.3.0.0', dbSubnetGroup: 'default-vpc-123',
    dbSubnetIds: ['subnet-1', 'subnet-2'], vpcSecurityGroupId: 'sg-123',
    iamPolicyResource: 'arn:aws:neptune-db:us-east-1:123:cluster-abc/*',
};

const baseParams = {
    pipelineName: 'test', neptuneDBName: 'mydb', neptuneDBregion: 'us-east-1',
    appSyncSchema: 'type Query { get: String }', lambdaFilesPath: '/tmp/lambda',
    outputFile: '/tmp/output/cdk.js', __dirname: '.', quiet: true,
    neptuneHost: 'db.cluster.us-east-1.neptune.amazonaws.com', neptunePort: '8182',
    outputFolderPath: '/tmp/output', resolverFilePath: '/tmp/r.js', resolverSchemaFilePath: '/tmp/s.json',
    schemaModel: { definitions: [{ kind: 'ObjectTypeDefinition', name: { value: 'Query' }, fields: [{ name: { value: 'get' } }] }] },
};

test('should exit on cluster info failure for neptune-db with IAM', async () => {
    mockGetNeptuneClusterDbInfoBy.mockRejectedValue(new Error('cluster not found'));

    try { await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }

    expect(mockProcessExit).toHaveBeenCalledWith(1);
});

test('should exit on cluster info failure for neptune-db without IAM', async () => {
    mockGetNeptuneClusterDbInfoBy.mockRejectedValue(new Error('cluster not found'));

    try { await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }

    expect(mockProcessExit).toHaveBeenCalledWith(1);
});

test('should generate CDK file for neptune-graph without calling cluster info', async () => {
    await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-graph' });

    expect(mockGetNeptuneClusterDbInfoBy).not.toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    const writtenContent = mockWriteFile.mock.calls[0][1];
    expect(writtenContent).toContain('NEPTUNE_IAM_AUTH = true');
    expect(writtenContent).toContain('NEPTUNE_DBSubnetGroup = null');
    expect(writtenContent).toContain('NEPTUNE_DBSubnetIds = null');
    expect(writtenContent).toContain('NEPTUNE_VpcSecurityGroupId = null');
});

test('should generate CDK file with VPC config for neptune-db with IAM', async () => {
    mockGetNeptuneClusterDbInfoBy.mockResolvedValue(clusterInfo);
    await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' });
    expect(mockWriteFile).toHaveBeenCalled();
    const writtenContent = mockWriteFile.mock.calls[0][1];
    expect(writtenContent).toContain("NEPTUNE_IAM_AUTH = true");
    expect(writtenContent).toContain("NEPTUNE_DBSubnetGroup = 'default-vpc-123'");
    expect(writtenContent).toContain("NEPTUNE_DBSubnetIds = 'subnet-1,subnet-2'");
    expect(writtenContent).toContain("NEPTUNE_VpcSecurityGroupId = 'sg-123'");
    expect(writtenContent).toContain("NEPTUNE_IAM_POLICY_RESOURCE = 'arn:aws:neptune-db:us-east-1:123:cluster-abc/*'");
});

test('should exit when neptune-db has IAM disabled but IAM flag was provided', async () => {
    mockGetNeptuneClusterDbInfoBy.mockResolvedValue({ ...clusterInfo, isIAMauth: false });
    try { await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: true, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }
    expect(mockProcessExit).toHaveBeenCalledWith(1);
});

test('should exit when neptune-db has IAM enabled but IAM flag was not provided', async () => {
    mockGetNeptuneClusterDbInfoBy.mockResolvedValue(clusterInfo);
    try { await createAWSpipelineCDK({ ...baseParams, isNeptuneIAMAuth: false, neptuneType: 'neptune-db' }); } catch (e) { if (!(e instanceof ExitCalled)) throw e; }
    expect(mockProcessExit).toHaveBeenCalledWith(1);
});

afterAll(() => {
    mockProcessExit.mockRestore();
});
