# Facebook Post-Collapser
A user script for Tampermonkey/Greasemonkey that collapses your Facebook feed into post summaries.

Personally, I find Facebook dangerously overwhelming. The barrage of social and cultural information disrupts any trains of thought I had going, destroys my concentration, and puts me in an anxious and self-critical mood. Unfortunately, it plays an irreplaceable role in my social life. This project aims to tame that onslaught of data.

Facebook Post-Collapser converts your newsfeed into an inbox-style list of summaries - each post is collapsed down to just its titlebar. Sponsored posts and ads are collapsed too. Each summary can be individually expanded and then collapsed again. _You decide_ which items are worth reading. It helps puts you back in control, instead of Facebook controlling your attention.

_This was a quick-and-dirty weekend project, and I have only tested it with Tampermonkey on Google Chrome. Please open an issue if you find bugs._

## Installation Instructions

1. Install the [Tampermonkey](https://tampermonkey.net/) browser extension.
2. Open the Tampermonkey menu and create a new script.
3. Copy and paste the source code from [facebook-collapser.js](/facebook-collapser.js)

## Possible Future Improvements

Some things I might take the time to improve:
- **Prettier expand/collapse buttons.** Right now I'm just using `<button>` elements with no styling. I would like to eventually use icons, and make them hover next to the post and summary instead of above the post and inside the summary (where the expand button is sometimes half-in-front of text).
- **Preload several posts.** Facebook only loads two posts when I first the page. These take up very little vertical space as summaries, leaving most of the page empty until you start scrolling and thereby trigger more posts to load. I could force Facebook to load more posts at the beginning, so your screen looks full even before you scroll.
- **Proper handling of nested posts.** Nested posts have nested titlebars, and my jQuery selector doesn't distinguish between them, yielding a summary box with multiple titlebars inside of it. I still find that it serves my purpose just as well, but I'd like to fix it eventually.
