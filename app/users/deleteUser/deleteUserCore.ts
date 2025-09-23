import { DeleteUserCorePayload } from "@/@types";
import { getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const deleteUserCore = async ({
    userId,
}: DeleteUserCorePayload): Promise<void | "lambdaError"> => {
    try {
        await mysqlClient.query(
            "UPDATE wordlessdb.users_table SET is_deleted = 1 WHERE userId = ?",
            [userId],
        );
    } catch (e) {
        return "lambdaError";
    } finally {
        if (mysqlClient && typeof mysqlClient.end === "function") {
            await mysqlClient.end();
        }
    }
};
