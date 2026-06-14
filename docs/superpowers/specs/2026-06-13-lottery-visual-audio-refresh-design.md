# KVB Lucky Draw Visual And Audio Refresh Design

## Goal

Improve the public lucky draw experience so it feels more premium, clearer, and more exciting without turning the page into a noisy arcade game. The refresh focuses on four user-visible outcomes:

- Prize images look brighter, sharper, and easier to recognize.
- The football-stadium background feels clearer and less muddy.
- The central `UNDI` button looks more like a familiar Indonesian lottery CTA.
- Clicking the draw button starts audio, a better motion sequence, and a clearer win reveal.

This design is intentionally limited to the front-end presentation layer. It does not change the draw security model, backend plan, or media storage architecture.

## Scope

### In Scope

- Refresh the visual treatment of the draw board and surrounding background.
- Improve prize image rendering and reduce the dark, low-contrast look.
- Redesign the `UNDI` button state and motion feedback.
- Upgrade the grid spin animation to feel more deliberate and readable.
- Add click-triggered football-themed audio playback:
  - short start sound
  - loop or sustained spin background cue
  - win impact sound
- Improve the post-win reveal so the prize is visually dominant and easy to identify.

### Out Of Scope

- Backend draw security refactor
- Firestore rules hardening
- New media storage service
- Admin upload workflow redesign
- Replacing all prize assets with new source artwork

## Problems To Solve

### Visual Clarity

The current page looks too dim and foggy. Background overlays, dark panels, and muted prize rendering combine to make the board feel heavy. Prize images do not stand out enough against the surrounding chrome.

### CTA Familiarity

The current center button works functionally, but it does not read like a strong local lottery trigger. It needs more urgency, tactile feedback, and a clearer active/loading state.

### Spin Readability

The existing draw motion does not create enough anticipation. Users should clearly feel start, acceleration, pacing, slowdown, and lock-on to the winning prize.

### Win Moment

The current winning moment lacks a premium reveal. The user should immediately know what was won, see the prize clearly, and feel a stronger reward payoff.

### Audio Timing

Audio should only start after a direct user click to comply with browser autoplay restrictions. Sound should reinforce the action, not overlap chaotically.

## Design Direction

The refresh follows a "premium event page with football energy" direction:

- Keep the existing blue and gold KVB tone.
- Reduce muddy darkness and excessive haze.
- Use motion and sound to create excitement.
- Avoid casino-like clutter or cartoonish arcade effects.
- Keep the prize itself as the visual hero during the win state.

## Recommended Approach

### Approach A: Minimal Skin Refresh

Only update colors, brightness, and button styles.

Pros:
- Fastest implementation
- Lowest regression risk

Cons:
- Does not fully solve the weak spin anticipation or win reveal

### Approach B: Premium Motion Refresh

Update visuals, CTA, spin pacing, prize clarity, and win presentation while keeping the current grid architecture.

Pros:
- Best balance of polish and risk
- Solves the core user complaints without rebuilding the feature
- Preserves current page structure and business flow

Cons:
- More moving parts than a pure style pass

### Approach C: Full Entertainment Rebuild

Turn the board into a more dramatic game-like experience with heavier animation and louder audiovisual treatment.

Pros:
- Highest excitement

Cons:
- Higher implementation and tuning cost
- Greater risk of looking cheap or off-brand

### Recommendation

Use Approach B.

It directly addresses image clarity, CTA familiarity, spin excitement, and post-win readability while preserving the existing board and business behavior.

## Component Changes

### `PrizeGraphic`

Responsibilities:
- Render prize assets more clearly
- Reduce the "dark and flat" appearance

Changes:
- Standardize image rendering with cleaner framing.
- Increase perceived brightness and contrast using restrained visual treatment.
- Avoid thick dark overlays on top of prize imagery.
- Keep fallback icons, but make them less dominant than real uploaded assets.

Expected result:
- Users can identify the prize immediately in both idle and win states.

### `GridLottery`

Responsibilities:
- Control the board interaction, movement cadence, and winning highlight

Changes:
- Redesign the center button to feel like an Indonesian raffle CTA.
- Add press feedback, disabled state, and processing state.
- Rework spin timing:
  - immediate click response
  - fast acceleration
  - readable mid-spin
  - obvious final slowdown
  - precise stop on the winning tile
- Add stronger winning tile emphasis at stop:
  - brighter border
  - scale-up pulse
  - nearby tiles slightly de-emphasized

Expected result:
- The board feels responsive and intentional, not random or cheap.

### `ConfettiEffect`

Responsibilities:
- Support celebration without covering the hero content

Changes:
- Reduce clutter and visual noise.
- Favor cleaner gold-toned particles or subtle celebratory bursts.
- Keep the prize visible at all times during the reveal.

Expected result:
- Celebration enhances the win instead of obscuring it.

### `audio.ts`

Responsibilities:
- Manage user-triggered playback and coordinated sound states

Changes:
- Introduce a three-stage audio flow:
  - click/start cue
  - spin loop or sustained motion bed
  - win cue
- Ensure playback starts only after explicit button interaction.
- Prevent overlapping duplicate sounds from repeated taps.
- Stop or fade the spin audio once the win cue starts.

Expected result:
- Sound feels synchronized and intentional rather than stacked or chaotic.

### `App.tsx`

Responsibilities:
- Orchestrate board state, win state, and reveal state

Changes:
- Connect click -> spin -> win timing with audio states.
- Trigger result reveal only after the board visually lands.
- Ensure the winning prize remains the main focus in the result layer.

Expected result:
- The entire draw flow feels cohesive from interaction to reward.

## Visual System Changes

### Background

- Keep the football-stadium theme.
- Reduce haze, over-dark overlays, and low-contrast fog.
- Increase clarity enough that the theme reads cleanly behind the board.
- Maintain separation so the board still remains the primary focal area.

### Draw Board

- Keep the metallic blue-gold frame.
- Simplify heavy glows and dirty shadows.
- Make the board look more premium and less murky.

### Center Button

- Keep `UNDI` as the main label.
- Strengthen its presence with clearer depth, hover/press feedback, and active glow.
- Add local-feeling secondary state text only when needed, such as processing.

### Winning Prize Presentation

- Make the winning prize image larger and cleaner in the result view.
- Blur or dim the surrounding board context slightly.
- Use one strong focus effect rather than many competing effects.

## Motion Design

### Click Phase

- Immediate tactile button press
- Start cue audio fires
- Board highlight begins without delay

### Spin Phase

- Fast initial sweep
- Stable readable pacing
- Controlled deceleration in the final few tiles
- Spin audio runs underneath

### Win Phase

- Winning tile locks in place
- Brief impact pulse
- Spin audio stops or fades
- Win sound triggers
- Prize reveal panel becomes visually dominant

## Audio Design

### Audio Sources

Use royalty-free football-themed audio only. The implementation should support:

- football crowd cheer or stadium intro cue
- energetic sports loop for spin motion
- short win impact cheer

### Playback Rules

- No auto-play on page load
- Audio begins only after user clicks the draw CTA
- If the user retries or re-enters the flow, audio state resets cleanly
- Audio should not continue indefinitely after the result settles

## Error Handling

- If a sound asset fails to load, the draw flow must still work silently.
- If prize images fail, fallback rendering remains readable.
- If the user clicks repeatedly during spin, duplicate animation and audio triggers are blocked.

## Testing Strategy

### Manual Verification

- Confirm the `UNDI` button visually changes on hover, press, and loading.
- Confirm sound only starts after user click.
- Confirm start, spin, and win sounds do not overlap incorrectly.
- Confirm the board slows down clearly before landing.
- Confirm winning prize is easy to identify on both desktop and mobile.
- Confirm the background appears clearer without overpowering the board.

### Automated Coverage

- Add targeted tests for audio state helpers where practical.
- Add focused behavior tests for spin-state transitions if the timing logic is extracted into testable helpers.

## Implementation Order

1. Improve prize image rendering and board/background clarity
2. Refresh the `UNDI` CTA and spin motion pacing
3. Add click-triggered football-themed audio flow
4. Upgrade the win reveal and celebration effect
5. Run responsive verification and final tuning

## Success Criteria

- Users can clearly recognize every prize image.
- The background looks sharper and less muddy.
- The center button feels like a strong raffle CTA.
- The spin sequence feels exciting and understandable.
- Sound begins only after click and enhances the experience.
- The winning prize is immediately visible and feels rewarding.
