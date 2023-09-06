npm install -g aws-cdk
cdk --version

'create a directory and init cdk app
create a directory and cd
cdk init app --language javascript

'For each dependency:'
npm install @aws-cdk/aws-aws-iam
npm install @aws-cdk/aws-ec2
npm install @aws-cdk/aws-appsync

' create CloudFormantion template
cdk synth

' to deploy
cdk deploy

' to rollback
cdk destroy