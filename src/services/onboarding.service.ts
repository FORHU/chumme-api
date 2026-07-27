import SessionSocialAccountSvc from "./net-communities/session-social-account.service";
import UserRepo from "../repositories/user.repository";
import SocialUserDiscoverySvc from "./social-user-discovery.service";
import SessionSocialAccountRepo from "../repositories/net-communities/session-social-account.repository";
import { prisma } from "../utils/prisma";
import { BadRequestError } from "../utils/error.util";

const MIN_ONBOARDING_CATEGORIES = 2;
const MIN_ONBOARDING_SUBCATEGORIES = 3;

export default class OnboardingSvc {
  static async connectGoogle(
    userId: string,
    idToken?: string,
    accessToken?: string,
  ) {
    return SessionSocialAccountSvc.linkGoogleAccount(
      userId,
      idToken,
      accessToken,
    );
  }

  /**
   * Onboarding step: save Chumme category / subcategory / topic selections (same rules as PUT /v1/social-discovery).
   */
  static async saveDiscovery(
    userId: string,
    data: {
      categoryIds: string[];
      subCategoryIds: string[];
      topicCategoryIds?: string[];
    },
  ) {
    return SocialUserDiscoverySvc.updateDiscovery(userId, data, {
      markOnboardingComplete: false,
    });
  }

  /**
   * Returns which onboarding steps are satisfied so the client can drive the flow.
   */
  static async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { onboardingCompleted: true },
    });

    const discovery = await SocialUserDiscoverySvc.getDiscovery(userId);
    const catCount = discovery.chummeCategories?.length ?? 0;
    const subCount = discovery.chummeSubCategories?.length ?? 0;
    const topicCount = discovery.chummeTopicCategories?.length ?? 0;

    const discoveryCategoriesDone =
      catCount >= MIN_ONBOARDING_CATEGORIES &&
      subCount >= MIN_ONBOARDING_SUBCATEGORIES;

    const youtubeAccount = await SessionSocialAccountRepo.getSocialAccount(
      userId,
      "youtube",
    );
    const connectYoutubeDone = !!youtubeAccount;

    const nextSteps: string[] = [];
    if (!discoveryCategoriesDone) {
      nextSteps.push("discovery_categories");
    }
    if (!connectYoutubeDone) {
      nextSteps.push("connect_google_youtube_optional");
    }

    // Interest/category selection was removed from onboarding, so it is no longer
    // a required step — completion only needs the client to POST /onboarding/complete.
    // (discoveryCategories/YouTube remain reported above as optional, informational.)
    const allRequiredStepsDone = true;

    return {
      onboardingCompleted: user?.onboardingCompleted ?? false,
      steps: {
        discoveryCategories: {
          done: discoveryCategoriesDone,
          required: {
            minCategories: MIN_ONBOARDING_CATEGORIES,
            minSubCategories: MIN_ONBOARDING_SUBCATEGORIES,
          },
          counts: {
            categories: catCount,
            subCategories: subCount,
            topicCategories: topicCount,
          },
        },
        connectGoogleYoutube: {
          done: connectYoutubeDone,
          description:
            "Link Google (YouTube) so we can use your channel for discovery and API features.",
        },
      },
      nextSteps,
      allRequiredStepsDone,
    };
  }

  static async complete(userId: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { onboardingCompleted: true },
    });
    if (existing?.onboardingCompleted) {
      return {
        message: "Onboarding already completed",
        alreadyCompleted: true,
      };
    }

    const status = await this.getStatus(userId);
    if (!status.allRequiredStepsDone) {
      throw new BadRequestError(
        `Finish required steps first: ${status.nextSteps.join(", ") || "unknown"}`,
      );
    }

    await UserRepo.markOnboardingComplete(userId);
    return { message: "Onboarding completed successfully" };
  }
}
