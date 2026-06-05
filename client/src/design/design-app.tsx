import {
  DesignCanvas,
  DCSection,
  DCArtboard,
} from "./design-canvas.js";
import {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRadio,
} from "./tweaks-panel.js";
import {
  MobileDetail,
  MobileDiscover,
  MobileExplore,
  MobileFriends,
  MobileOnboarding,
  MobileProfile,
} from "./mobile-screens.js";
import {
  DesktopDiscover,
  DesktopExplore,
  DesktopFriends,
  DesktopProfile,
} from "./desktop-screens.js";
import type { CardVariant } from "./swipe-cards.js";

type DesignTweaksState = { featuredVariant: CardVariant };

export default function DesignApp() {
  const [t, setTweak] = useTweaks<DesignTweaksState>({
    featuredVariant: "rich",
  });

  const FeaturedDiscover = () => <MobileDiscover variant={t.featuredVariant} />;

  return (
    <>
      <DesignCanvas>
        <DCSection
          id="featured"
          title="Sift · revamped UX"
          subtitle="Apple Music–inspired, light, typographic. Toggle the featured card layout in the Tweaks panel."
        >
          <DCArtboard id="feat-discover" label="Featured · Discover (Tweakable)" width={390} height={844}>
            <FeaturedDiscover />
          </DCArtboard>
          <DCArtboard id="feat-onboarding" label="01 · Onboarding" width={390} height={844}>
            <MobileOnboarding />
          </DCArtboard>
          <DCArtboard id="feat-detail" label="06 · Card Detail" width={390} height={844}>
            <MobileDetail />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="card-variants"
          title="Discover · 3 card variants"
          subtitle="Same swipe stack, different information density. Drag a card or tap the keep/skip buttons."
        >
          <DCArtboard id="v-minimal" label="A · Minimal" width={390} height={844}>
            <MobileDiscover variant="minimal" />
          </DCArtboard>
          <DCArtboard id="v-rich" label="B · Rich metadata" width={390} height={844}>
            <MobileDiscover variant="rich" />
          </DCArtboard>
          <DCArtboard id="v-friend" label="C · Friend‑forward" width={390} height={844}>
            <MobileDiscover variant="friend" />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="mobile-app"
          title="Mobile · the rest of the app"
          subtitle="Explore, Friends, Profile."
        >
          <DCArtboard id="m-explore" label="03 · Explore" width={390} height={844}>
            <MobileExplore />
          </DCArtboard>
          <DCArtboard id="m-friends" label="04 · Friends" width={390} height={844}>
            <MobileFriends />
          </DCArtboard>
          <DCArtboard id="m-profile" label="05 · Profile" width={390} height={844}>
            <MobileProfile />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="desktop"
          title="Desktop · web app"
          subtitle="The same product, scaled up. Sidebar, live taste profile, richer queue."
        >
          <DCArtboard id="d-discover" label="D01 · Discover" width={1280} height={800}>
            <DesktopDiscover />
          </DCArtboard>
          <DCArtboard id="d-explore" label="D02 · Explore" width={1280} height={800}>
            <DesktopExplore />
          </DCArtboard>
          <DCArtboard id="d-friends" label="D03 · Friends" width={1280} height={800}>
            <DesktopFriends />
          </DCArtboard>
          <DCArtboard id="d-profile" label="D04 · Profile" width={1280} height={800}>
            <DesktopProfile />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Featured discover card">
          <TweakRadio
            label="Layout variant"
            value={t.featuredVariant}
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "rich", label: "Rich" },
              { value: "friend", label: "Friend" },
            ]}
            onChange={(v) => setTweak("featuredVariant", v)}
          />
          <div
            style={{
              fontSize: 11,
              color: "rgba(40,30,20,0.6)",
              lineHeight: 1.4,
              marginTop: 6,
            }}
          >
            Changes the first artboard. All three are also shown side‑by‑side in the next section.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}
