import { CognitoJwtVerifier } from "aws-jwt-verify";
import { envConfig } from "@/config";

export const getCognitoJwtVerifier = () => {
    return CognitoJwtVerifier.create({
        userPoolId: envConfig.COGNITO_USER_POOL_ID,
        tokenUse: "id",
        clientId: envConfig.COGNITO_CLIENT_ID,
    });
};
