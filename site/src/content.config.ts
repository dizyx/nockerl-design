import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Extend Starlight's docs schema with Nockerl review metadata so every page can
// declare its review status and the platforms it covers. The StatusBadge and the
// Review queue read these fields from `entry.data`.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Review lifecycle: draft -> review -> approved.
        status: z.enum(['draft', 'review', 'approved']).default('draft'),
        // Which platforms this spec covers. Empty = cross-cutting / not platform-bound.
        platforms: z.array(z.enum(['web', 'android', 'swift'])).default([]),
        // Native platforms whose Kotlin / Swift tab now shows the REAL PUBLISHED package
        // API (com.dizyx.nockerl.design.* on Maven / the NockerlDesign SwiftPM package) -
        // NOT the canonical-app reference. MarkdownContent shows the app-reference caveat
        // ONLY for native platforms in `platforms` that are NOT listed here. Per-platform
        // because the published sets differ (e.g. Swift ships NockerlSlider/Tree; Kotlin ships
        // NockerlAvatar/NockerlTextField).
        nativePublished: z.array(z.enum(['android', 'swift'])).default([]),
      }),
    }),
  }),
};
