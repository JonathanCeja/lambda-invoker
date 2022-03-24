import fastify from 'fastify';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

const REGION: string = process.env['REGION'] || '';
const IDENTITY_POOL_ID: string = process.env['IDENTITY_POOL_ID'] || '';

const lambda_client = new LambdaClient({
    credentials: fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: REGION }),
        identityPoolId: IDENTITY_POOL_ID
    }),
    region: REGION,
    endpoint: process.env['AWS_ENDPOINT_OVERRIDE']
});
const app = fastify();

app.post<
    {Body: {
      name: string,
      payload: object
    }}
    >('/invokeLambda', async (req, rep) =>  {
        console.log("POST /invokeLambda");
        const { name, payload } = req.body;
        let checkResponse
        try {
            const data = await lambda_client.send(
                new InvokeCommand({
                    FunctionName: name,
                    Payload: new TextEncoder().encode(JSON.stringify(payload)),
                })
            )
            checkResponse = JSON.parse(
                new TextDecoder('utf-8').decode(data.Payload) || '{}');

            console.log(`checkResponse: ${JSON.stringify(checkResponse)}`)
        } catch (error) {
            rep.status(500).send(error)
        }

        rep.status(200);
        rep.send({ 
            "data" : {
                "StatusCode": checkResponse['statusCode'],
                "LogResult": checkResponse['body'],
                "ExecutedVersion": "$LATEST"
            }
        });
        return;
    });

app.listen(3001, '0.0.0.0', (err, address) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`'api is up!' at ${address}`);
});
