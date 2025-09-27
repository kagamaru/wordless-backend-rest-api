import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { envConfig } from "@/config";
import { UserSubInfo } from "@/@types";
import { getCognitoJwtVerifier, getItemFromDynamoDB } from "@/utility";

const handleError = (error: unknown): { result: "invalid" } => {
    console.error(error);
    return { result: "invalid" };
};

export const verifyToken = async ({
    authHeader,
    userId,
}: {
    authHeader: string;
    userId: string;
}): Promise<{ result: "valid" | "invalid" }> => {
    let token: string;
    try {
        token = authHeader.split(" ")[1];
    } catch (error) {
        return handleError(error);
    }

    const verifier = getCognitoJwtVerifier();

    let payload: JwtPayload;
    try {
        payload = await verifier.verify(token);
    } catch (error) {
        return handleError(error);
    }

    let userSubInfo: UserSubInfo;
    try {
        userSubInfo = (await getItemFromDynamoDB(envConfig.USER_SUB_TABLE, {
            userSub: payload.sub,
        })) as UserSubInfo;
    } catch (error) {
        return handleError(error);
    }

    return { result: userSubInfo.userId === userId ? "valid" : "invalid" };
};
