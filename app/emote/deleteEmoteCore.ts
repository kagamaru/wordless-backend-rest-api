import { getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const deleteEmoteCore = async ({
    emoteId,
}: {
    emoteId: string;
}): Promise<"lambdaError" | "success"> => {
    try {
        await mysqlClient.query(
            `UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE emote_id = ?`,
            [emoteId],
        );
        return "success";
    } catch (error) {
        console.error(error);
        return "lambdaError";
    } finally {
        await mysqlClient.end();
    }
};
