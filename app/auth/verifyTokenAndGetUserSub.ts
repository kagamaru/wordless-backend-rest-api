import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { UserSubAndVerifyResult } from "@/@types";
import { getCognitoJwtVerifier } from "@/utility";

const handleError = (error: unknown): "invalid" => {
    console.error(error);
    return "invalid";
};

export const verifyTokenAndGetUserSub = async ({
    authHeader,
}: {
    authHeader: string;
}): Promise<UserSubAndVerifyResult | "invalid"> => {
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

    return {
        userSub: payload.sub,
        isValid: "valid",
    };
};
