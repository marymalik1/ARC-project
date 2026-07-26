# ARC Farm Intelligence SVG Logo Design

## Goal

Replace the hand-drawn ARC sidebar mark with the supplied “Arc) farm intelligence”
brand lockup on every page that uses the shared sidebar.

## Asset

- Use the supplied JPEG only as the visual source.
- Recreate the visible white and red logo artwork as a true vector SVG.
- Do not embed the JPEG inside the SVG.
- Remove the source image's black background and outer padding so the SVG has a
  transparent background and a tight view box.
- Preserve the wording, capitalization, trademark mark, colors, proportions, and
  relative placement of the supplied artwork.

## Integration

- Store the finished SVG in `public/assets`.
- Update the existing `ArcLogo` component to render the SVG as an accessible image
  with the text alternative “Arc farm intelligence”.
- Keep `ArcLogo` as the single shared branding component so the replacement appears
  in both User Management and Customer Care.
- Replace the old mark-and-text sizing rules with responsive image sizing that fits
  both existing sidebar variants.
- Do not change page titles, metadata, navigation, or favicon behavior.

## Verification

- Add a focused browser assertion that the shared sidebar exposes the new logo image
  and its accessible name.
- Confirm the assertion fails before the component change and passes afterward.
- Run the unit tests, end-to-end tests, linter, and production build.
- Inspect screenshots at the existing desktop viewport and a mobile viewport to
  confirm that the complete lockup is visible, legible, and not distorted.
