import { getRDSDBClient } from "@/utility";
import {
    FollowCoreResponse as DeleteFollowCoreResponse,
    FollowCorePayload as DeleteFollowCorePayload,
} from "@/@types";

const mysqlClient = getRDSDBClient();

export const deleteFollowCore = async ({
    followerId,
    followeeId,
}: DeleteFollowCorePayload): Promise<
    DeleteFollowCoreResponse | "lambdaError"
> => {
    let followingArray: Array<{ followee_id: string }> = [];
    let followeeArray: Array<{ follower_id: string }> = [];

    try {
        await mysqlClient.query(
            `DELETE FROM wordlessdb.follow_table WHERE follower_id = ? AND followee_id = ?`,
            [followerId, followeeId],
        );

        followingArray = await mysqlClient.query(
            `SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?`,
            [followeeId],
        );
        followeeArray = await mysqlClient.query(
            `SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?`,
            [followeeId],
        );

        return {
            totalNumberOfFollowing: followingArray.length,
            followingUserIds: followingArray.map((item) => item.followee_id),
            totalNumberOfFollowees: followeeArray.length,
            followeeUserIds: followeeArray.map((item) => item.follower_id),
        };
    } catch (error) {
        return "lambdaError";
    } finally {
        await mysqlClient.end();
    }
};
