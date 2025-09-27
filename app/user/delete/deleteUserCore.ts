import { DeleteUserCorePayload } from "@/@types";
import { getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const deleteUserCore = async ({
    userId,
}: DeleteUserCorePayload): Promise<"success" | "lambdaError"> => {
    try {
        await mysqlClient.query(
            "UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE user_id = ?",
            [userId],
        );
        await mysqlClient.query(
            "DELETE FROM wordlessdb.follow_table WHERE follower_id = ? OR followee_id = ?",
            [userId, userId],
        );
        return "success";
    } catch (e) {
        return "lambdaError";
    } finally {
        if (mysqlClient && typeof mysqlClient.end === "function") {
            await mysqlClient.end();
        }
    }
};
