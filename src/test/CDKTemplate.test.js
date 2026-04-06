import { readFileSync } from 'fs';

const templateSource = readFileSync('./templates/CDKTemplate.js', 'utf8');

function renderTemplate({ neptuneType, neptuneIAMAuth }) {
    return templateSource
        .replace("const NEPTUNE_TYPE = '';", `const NEPTUNE_TYPE = '${neptuneType}';`)
        .replace("const NEPTUNE_IAM_AUTH = false;", `const NEPTUNE_IAM_AUTH = ${neptuneIAMAuth};`)
        .replace("const NEPTUNE_DBSubnetGroup = null;", "const NEPTUNE_DBSubnetGroup = 'vpc-123';")
        .replace("const NEPTUNE_DBSubnetIds = null;", "const NEPTUNE_DBSubnetIds = 'subnet-1,subnet-2';")
        .replace("const NEPTUNE_VpcSecurityGroupId = null;", "const NEPTUNE_VpcSecurityGroupId = 'sg-123';")
        .replace("const NEPTUNE_HOST = '';", "const NEPTUNE_HOST = 'db.cluster.us-east-1.neptune.amazonaws.com';")
        .replace("const NEPTUNE_IAM_POLICY_RESOURCE = '*';", "const NEPTUNE_IAM_POLICY_RESOURCE = 'arn:aws:neptune-db:us-east-1:123:cluster-abc/*';");
}

function evaluateTemplate({ neptuneType, neptuneIAMAuth }) {
    const code = renderTemplate({ neptuneType, neptuneIAMAuth });
    // Extract from "const lambdaProps = {" up to "echoLambda = new lambda.Function"
    const match = code.match(/const lambdaProps = \{[\s\S]*?(?=\n\s*echoLambda = new lambda\.Function)/);
    if (!match) throw new Error('Could not extract lambdaProps block from CDKTemplate.js — check that "const lambdaProps = {" and "echoLambda = new lambda.Function" markers still exist in the template');

    const managedPolicies = [];
    const fn = new Function('NEPTUNE_TYPE', 'NEPTUNE_IAM_AUTH', 'NEPTUNE_DBSubnetGroup', 'NEPTUNE_DBSubnetIds', 'NEPTUNE_VpcSecurityGroupId', 'NEPTUNE_IAM_POLICY_RESOURCE', 'NAME', `
        const ec2 = {
            Vpc: { fromLookup: (_, __, o) => 'vpc-stub' },
            Subnet: { fromSubnetId: (_, __, id) => id },
            SecurityGroup: { fromSecurityGroupId: (_, __, id) => 'sg-stub' }
        };
        const iam = {
            ManagedPolicy: { fromAwsManagedPolicyName: (n) => n },
            PolicyStatement: class { constructor(o) { Object.assign(this, o); } },
            Effect: { ALLOW: 'Allow' }
        };
        const lambda_role = { addManagedPolicy: (p) => managedPolicies.push(p) };
        const managedPolicies = [];
        const Duration = { seconds: (s) => s };
        const lambda = { Code: { fromAsset: (f) => f }, Runtime: { NODEJS_18_X: 'nodejs18.x' } };
        const self = { parseNeptuneDomainFromHost: () => 'neptune.amazonaws.com' };
        const LAMBDA_FUNCTION_NAME = 'testFn';
        const LAMBDA_ZIP_FILE = 'test.zip';
        const REGION = 'us-east-1';
        const NEPTUNE_HOST_LOCAL = 'db.cluster.us-east-1.neptune.amazonaws.com';
        const NEPTUNE_PORT = '8182';
        const NEPTUNE_DB_NAME = 'testdb';
        let env = {
            NEPTUNE_HOST: NEPTUNE_HOST_LOCAL,
            NEPTUNE_PORT: NEPTUNE_PORT,
            NEPTUNE_IAM_AUTH_ENABLED: NEPTUNE_IAM_AUTH.toString(),
            LOGGING_ENABLED: 'false',
            NEPTUNE_DB_NAME: NEPTUNE_DB_NAME,
            NEPTUNE_REGION: REGION,
            NEPTUNE_DOMAIN: 'neptune.amazonaws.com',
            NEPTUNE_TYPE: NEPTUNE_TYPE,
        };
        ${match[0]}
        return { lambdaProps, managedPolicies };
    `);

    return fn(neptuneType, neptuneIAMAuth, 'vpc-123', 'subnet-1,subnet-2', 'sg-123', 'arn:aws:neptune-db:us-east-1:123:cluster-abc/*', 'Test');
}

test('neptune-db without IAM: VPC config, no IAM policy', () => {
    const { lambdaProps, managedPolicies } = evaluateTemplate({ neptuneType: 'neptune-db', neptuneIAMAuth: false });
    expect(lambdaProps.vpc).toBeDefined();
    expect(lambdaProps.vpcSubnets).toBeDefined();
    expect(lambdaProps.securityGroups).toBeDefined();
    expect(lambdaProps.initialPolicy).toBeUndefined();
    expect(managedPolicies).toContain('service-role/AWSLambdaVPCAccessExecutionRole');
});

test('neptune-db with IAM: VPC config and IAM policy', () => {
    const { lambdaProps, managedPolicies } = evaluateTemplate({ neptuneType: 'neptune-db', neptuneIAMAuth: true });
    expect(lambdaProps.vpc).toBeDefined();
    expect(lambdaProps.vpcSubnets).toBeDefined();
    expect(lambdaProps.securityGroups).toBeDefined();
    expect(lambdaProps.initialPolicy).toBeDefined();
    expect(lambdaProps.initialPolicy[0].actions).toEqual(expect.arrayContaining([
        'neptune-db:connect',
        'neptune-db:ReadDataViaQuery',
    ]));
    expect(managedPolicies).toContain('service-role/AWSLambdaVPCAccessExecutionRole');
});

test('neptune-graph with IAM: IAM policy, no VPC config', () => {
    const { lambdaProps } = evaluateTemplate({ neptuneType: 'neptune-graph', neptuneIAMAuth: true });
    expect(lambdaProps.vpc).toBeUndefined();
    expect(lambdaProps.vpcSubnets).toBeUndefined();
    expect(lambdaProps.securityGroups).toBeUndefined();
    expect(lambdaProps.initialPolicy).toBeDefined();
    expect(lambdaProps.initialPolicy[0].actions).toContain('neptune-graph:connect');
});

test('neptune-graph without IAM: no VPC, no IAM policy', () => {
    const { lambdaProps } = evaluateTemplate({ neptuneType: 'neptune-graph', neptuneIAMAuth: false });
    expect(lambdaProps.vpc).toBeUndefined();
    expect(lambdaProps.vpcSubnets).toBeUndefined();
    expect(lambdaProps.securityGroups).toBeUndefined();
    expect(lambdaProps.initialPolicy).toBeUndefined();
});

test('should guard VPC config by NEPTUNE_TYPE not NEPTUNE_IAM_AUTH', () => {
    const code = renderTemplate({ neptuneType: 'neptune-db', neptuneIAMAuth: true });
    expect(code).not.toMatch(/if\s*\(\s*!NEPTUNE_IAM_AUTH\s*\)/);
});
