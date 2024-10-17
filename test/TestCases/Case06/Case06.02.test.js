import {checkFileContains, readJSONFile} from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case06/case.json');
let neptuneType = 'neptune-db';
if (casetest.host.includes('neptune-graph')) {
    neptuneType = 'neptune-graph';
}
checkFileContains('./test/TestCases/Case06/output/AirportCDKTestJest-cdk.js', [
    'const NAME = \'AirportCDKTestJest\';',
    'const NEPTUNE_HOST = \'' + casetest.host + '\';',
    'const NEPTUNE_PORT = \'' + casetest.port + '\';',
    'const NEPTUNE_TYPE = \'' + neptuneType + '\';',
    'vpcSubnets',
    'securityGroups'
]);
