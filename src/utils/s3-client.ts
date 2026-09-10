import { S3Client } from "@aws-sdk/client-s3";
import {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} from "../config";
import logger from "./logger";

/**
 * The one S3 client, shared by `s3.util` and `s3-presigned.util`.
 *
 * CREDENTIALS ARE ONLY PASSED WHEN THEY EXIST. This is the whole point of the
 * file: `new S3Client({ credentials: { accessKeyId: undefined, ... } })` does
 * NOT fall back to the SDK's default provider chain — supplying the key at all
 * overrides it. So on a box using an EC2 instance role, hardcoding the
 * credentials block makes the SDK ignore the role and fail with a missing
 * credentials error, even though the instance is perfectly authorised.
 *
 * Omitting it lets the default chain run: environment → shared config →
 * container/instance metadata. That works for a static key pair AND for an
 * instance role, without a code change between environments.
 */
const hasStaticCredentials = Boolean(
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY,
);

if (hasStaticCredentials) {
  logger.info("[S3] Using static credentials from the environment");
} else {
  // Not a warning: this is the preferred setup. Saying so plainly stops the
  // next person assuming the config is broken because no key is set.
  logger.info(
    "[S3] No static credentials set — using the AWS default provider chain " +
      "(EC2 instance role or container credentials)",
  );
}

export const s3Client = new S3Client({
  region: AWS_REGION,
  ...(hasStaticCredentials && {
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  }),
});

export default s3Client;
