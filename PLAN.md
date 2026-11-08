# Catch the Monster: Enhancement Plan

Goal: let players choose a **monster** and a **weapon**, give each weapon its own gameplay, fix the bugs found in the review, move the project to a new GitHub repo called `hit-the-monster`, and publish it on Vercel.

**Decisions made**
- Monsters: 🤖 Robot, 👽 Alien, 🧟 The Ex, 👾 Classic (the 4th option and the default)
- Weapons: ❤️ Hearts, 🥚 Egg, 👊 Punch, **each with different gameplay** (Step 3)
- Git: keep this folder and its history, and point it at a new GitHub repo named `hit-the-monster`
- Hosting: Vercel, as a static site with no build step

**Files touched:** `index.html`, `script.js`, `style.css`, plus `PLAN.md` and `README.md` (both new). No new image or sound files.

---

## Step 0: Prep

1. Fix the filename case. The file on disk is `Script.js`, but git and `index.html` use `script.js`. Run:
   ```
   git mv -f Script.js script.js
   ```
   (Run it only if `git status` shows a mismatch.)
2. Create a working branch:
   ```
   git checkout -b feature/monsters-and-weapons
   ```

**Test**
- [ ] `git ls-files` lists `script.js` in lowercase
- [ ] The game still loads and plays exactly as before

---

## Step 1: Setup screen (choose monster and weapon)

**index.html**
- Above the difficulty dropdown, add two `<fieldset>` groups of radio buttons, styled as cards:
  - `name="monster"`: `classic`, `robot`, `alien`, `ex`
  - `name="weapon"`: `heart`, `egg`, `punch`
- Each card shows a big emoji and a label. Each weapon card also has a one-line rule, for example "Punch: +2 points, the monster moves fast".

**style.css**
- Hide the real radio button visually, but keep it accessible.
- Style the `label` as a neon card. Use `input:checked + label` for the glow, and `:focus-visible` for a keyboard focus ring.
- Wrap the cards to 2 per row on screens narrower than 600px.

**script.js**
- Read the selected options with `document.querySelector('input[name="monster"]:checked').value`.
- Save the choices to `localStorage` (`monster`, `weapon`) and restore them when the page loads.
- Disable all the setup inputs while a game is running, the same way difficulty is now.

**Test**
- [ ] Clicking a card selects it, and only one card per group can be selected
- [ ] Tab and arrow keys move between cards, and the focus ring is visible
- [ ] Reload the page: the last choices are still selected
- [ ] During a game the cards can't be changed. After game over they can.
- [ ] On a phone (or DevTools at 375px wide) the cards wrap and nothing scrolls sideways

---

## Step 2: Monster avatars

**script.js**: one config object, so adding a monster means adding a single entry:
```js
const MONSTERS = {
  classic: { emoji: "👾", name: "Classic", glow: "#00f5ff",
             lines: ["Grr!", "Missed me... wait"] },
  robot:   { emoji: "🤖", name: "Robot",   glow: "#38bdf8",
             lines: ["BEEP BOOP!", "SYSTEM ERROR", "Rebooting..."] },
  alien:   { emoji: "👽", name: "Alien",   glow: "#4ade80",
             lines: ["Zorp!", "Take me to your leader", "Earthlings!"] },
  ex:      { emoji: "🧟", name: "The Ex",  glow: "#f43f5e",
             lines: ["We need to talk...", "It's not you, it's me", "Can I get my hoodie back?"] },
};
```
- When the monster selection changes, set `monster.textContent` and a CSS variable `--glow` for the drop-shadow colour.
- On each hit, show a random line from `lines` as a small speech bubble that floats up and fades out after about 0.8s.
- To use your own art later, replace `emoji` with an `img` path and render an `<img>` instead.

**Test**
- [ ] Each of the 4 monsters appears in the game area once selected, before Start is pressed
- [ ] The glow colour changes per monster
- [ ] Hitting the monster shows one of its own lines, and the bubble disappears on its own
- [ ] The monster's size still follows the difficulty setting (easy, medium, hard)

---

## Step 3: Weapons, each with different gameplay

**script.js**: one config object:
```js
const WEAPONS = {
  heart: { emoji: "❤️", name: "Hearts", points: 1, hitRadius: 0,  autoMoveMs: null, timeBonusEvery: 5 },
  egg:   { emoji: "🥚", name: "Egg",    points: 1, hitRadius: 35, autoMoveMs: null, timeBonusEvery: 0 },
  punch: { emoji: "👊", name: "Punch",  points: 2, hitRadius: 0,  autoMoveMs: 900,  timeBonusEvery: 0 },
};
```

| Weapon | Rule | How it's implemented |
|---|---|---|
| ❤️ Hearts | +1 point. **Every 5 hits gives +1 second** of time. | Count the hits. When `hits % 5 === 0`, add `timeLeft++` and flash "+1s" next to the timer. |
| 🥚 Egg | +1 point. **Splash: a hit up to 35px outside the monster still counts.** | Listen for `pointerdown` on `#game-area`, not on the monster. Measure the distance from the click to the monster's bounding box. A hit is when distance ≤ `hitRadius`. |
| 👊 Punch | **+2 points**, but **the monster jumps on its own every 0.9s**. | Start a `setInterval(moveMonster, autoMoveMs)` when the game starts. Clear it at game over. |

**Hit detection, shared by all weapons**
- Use a single `pointerdown` listener on `#game-area` (this also makes touch faster).
- `isHit(event)`: get the monster's rectangle with `getBoundingClientRect()`, grow it by `hitRadius`, and check whether the click point is inside.
- On a hit: add the points, show the effect, play the sound, show the reaction line, and move the monster.
- On a miss: show a small "miss" puff. There is no penalty.

**Visual effects (CSS animations)**
- **Cursor:** inside `#game-area`, the cursor is the weapon emoji, made with an SVG data URL generated in JS (`cursor: url(...) 16 16, pointer`).
- **Projectile:** a weapon emoji flies from the bottom-centre of the game area to the click point in about 150ms, then is removed.
- ❤️ **Hearts:** 3 to 5 small hearts float up and fade, and the monster turns pink (a `blush` class).
- 🥚 **Egg:** a 🍳 splat stays at the click point and fades over 1s.
- 👊 **Punch:** a 💥 flash plus a `shake` animation on the monster.
- Every effect element is removed on `animationend`, so the page doesn't fill up with leftover elements.

**Sounds (Web Audio API, no files)**
- `playTone(type)` uses an `OscillatorNode` and a `GainNode`:
  - heart: a short rising "pop" (sine, 600 to 900 Hz)
  - egg: a "splat" (a burst of noise through a low-pass filter)
  - punch: a low "thud" (triangle, 150 to 60 Hz)
- Create the `AudioContext` on the first click, since browsers block audio before the user interacts. Keep `start.wav` and `game-over.wav`.
- Replace `catch.wav` with the weapon sounds, or keep it as a fallback.

**High scores per weapon**
- Because the scoring rules differ, save a separate high score for each weapon: `localStorage["highScore_heart"]` and so on. Read the values with `Number(...)`.
- Ignore the old single `highScore` key, so every weapon starts at 0. The old scores used different rules, so they can't be compared.
- The "High Score" box shows the high score for the selected weapon.

**Test**
- [ ] The cursor changes to the selected weapon inside the game area only
- [ ] ❤️: after 5 hits the timer goes up by 1 and "+1s" is shown. After 10 hits, +2s in total.
- [ ] 🥚: clicking just next to the monster (within about 1cm) counts. Clicking far away doesn't.
- [ ] 👊: each hit gives +2, and the monster moves on its own about once a second. It stops moving after game over.
- [ ] Each weapon plays its own effect and sound
- [ ] Missing shows a puff, and the score doesn't change
- [ ] After 30 or more hits, DevTools shows no leftover effect elements in `#game-area`
- [ ] The high score is separate per weapon, and switching weapons updates the "High Score" box
- [ ] Clicking before Start does nothing

---

## Step 4: Game Over screen (replaces `alert`)

**index.html**: add `<div id="game-over" hidden>` inside `#game-area` with:
- the monster emoji, and "You hit The Ex 14 times with Eggs"
- your score, and "🏆 New high score!" if you beat it
- a **Play Again** button, which starts a new game with the same choices

**script.js**: create a single `endGame()` function that:
- clears the timer and the Punch auto-move interval
- saves the high score
- plays the game-over sound
- shows the overlay
- re-enables the setup controls

**Test**
- [ ] No browser `alert` appears
- [ ] The overlay shows the correct monster, weapon and score
- [ ] "New high score" appears only when the high score is beaten
- [ ] Play Again starts a fresh 15s game with the score reset
- [ ] The game-over sound plays fully

---

## Step 5: Bug fixes from the review

1. **Minimum monster size:** `monsterSize = Math.max(monsterSize - 15, 18)` after 10 points. Today it can drop to 5px on Hard.
2. **Start button:** set `startButton.disabled = true` while a game runs, and play the start sound only when a game actually starts.
3. **Start position:** call `moveMonster()` when a game starts.
4. **High score type:** use `Number(localStorage.getItem(...)) || 0`.
5. **Input:** use `pointerdown` instead of `click`. This is covered in Step 3.
6. **Timer guard:** check `timeLeft <= 0` instead of `=== 0`, so the Hearts time bonus can't skip past zero.
7. **CSS cleanup:** merge the two `h1` blocks, and remove the commented-out code in `script.js`.
8. **Audio:** add `.play().catch(() => {})` so blocked autoplay doesn't throw errors in the console.

**Test**
- [ ] Hard difficulty with 10+ hits: the monster is still clickable on a phone
- [ ] Spamming Start during a game does nothing, and there's no repeated sound
- [ ] The monster appears at a random spot on Start
- [ ] The DevTools console has no errors during a full game

---

## Step 6: Polish and sharing

- `<meta name="description" content="Pick a monster, pick a weapon, and hit it as many times as you can in 15 seconds!">`
- An emoji favicon: `<link rel="icon" href="data:image/svg+xml,<svg ...>👾</svg>">`
- Open Graph tags (`og:title`, `og:description`) so the link previews nicely when shared
- Remove the blank line before `<!DOCTYPE html>`
- Add `README.md` with: how to play, the weapon rules, how to run it locally, and the live URL

**Test**
- [ ] The browser tab shows the 👾 icon
- [ ] Lighthouse (in Chrome DevTools) scores 90 or more for Accessibility and Best Practices

---

## Step 6b: Changes after the first playtest

These came from the first playtest feedback:
- **Louder sounds with more character:** all hit sounds go through a master gain and a compressor. Each weapon has its own synthesized sound: ❤️ kiss + C-E-G-C melody, 🥚 three cracks + splat, 👊 impact + deep thud, 👟 whoosh + slap + "boing". Selecting a weapon card plays its sound as a preview. The volume is set by `SOUND_VOLUME` in `script.js`.
- **New weapon, 👟 Shoe:** +3 points per hit, with a 600ms reload (taps during the reload show ⏳ and do nothing). On a hit, the shoe bounces off, 💫 stars appear and the monster wobbles.
- **New monster, 🧸 Teddy:** the friendly one. Monsters can have `loveLines`, which are used when hit with Hearts (Teddy: "Aww, love you too! 🥰"; The Ex: "Don't try to win me back...").
- **Layout:** at widths of 900px and up, the game is on the left and an options panel (monster, weapon, difficulty, Start) is on the right, with no scrolling at 1366×650. Below 900px the options come first, and Start scrolls the game into view.

**Test**
- [ ] Hit sounds are clearly audible at normal laptop volume, and each weapon sounds different
- [ ] Clicking a weapon card previews its sound
- [ ] 👟: +3 per hit, and a second tap within 0.6s shows ⏳ and gives no points
- [ ] 🧸 + ❤️ shows love lines, and 🧸 + 👟 shows "Meanie" lines
- [ ] On a laptop, the whole game and all options are visible without scrolling
- [ ] On a phone, pressing Start scrolls to the game

---

## Step 6c: Changes after the second playtest

- **Timer** is now 30 seconds (`GAME_SECONDS`).
- **🔄 New Game button:** stops the game at any time (clearing the timers, walls and marks), unlocks the options, and does **not** save the score as a high score.
- **3-column layout:** controls on the left (Start, New Game, difficulty pills), the game in the middle, monster and weapon cards on the right. Below 1100px the page stacks: choices, then controls, then the game.
- **Drawn monsters (SVG):** each monster is drawn with separate eye and mouth parts, so the face itself changes.
  - Attacked: normal → 😮 shocked (2 hits) → 😢 sad with a tear (5) → ✖✖ knocked out with spinning stars (9) → 🌀 dizzy spiral eyes (14).
  - Hearts: smile → ^^ happy and blushing (3) → 😍 heart eyes (7).
  - A short flinch (> < eyes, gritted teeth) or giggle face on every hit.
- **Damage marks** stay on the monster and move with it (at most 10): 💋 kisses, 🩹 bandages and bruises, ✖ crosses, dripping egg yolk, soot. The game-over screen shows the monster as it ended up.
- **Egg splash:** a drawn cracked egg with a yolk splat and shell pieces replaces the 🍳.
- **The monster stays the same size**, with distractions instead:
  - **Defence:** Teddy covers its eyes with its paws, the Ex uses a pillow, the Alien an energy shield, the Robot a metal shutter, and Classic hides in a box. Hits are BLOCKED (with a clang). It defends more often with a higher score and harder difficulty.
  - **Moving walls:** clicks on a wall are blocked, and the monster can hide behind them. Easy: 1 wall after 10 points. Medium: 1, then 2 after 15 points. Hard: 2 fast walls.
- **⚡ Zapper:** +1 point (x2 vs Alien), a lightning bolt from the top of the game area and a "bzzzt" sound. It stuns the monster for 1s (it freezes and can't defend), with a 0.35s reload. The Alien has its own lines for it.

**Test**
- [ ] A game lasts 30s
- [ ] New Game during a game: the timer stops, the options unlock, and the high score is unchanged
- [ ] Every monster shows its faces in order as hits add up (punch 9 times → ✖✖ with stars)
- [ ] Hearts on Teddy: heart eyes and kiss marks, and no stars
- [ ] Each monster's defence item shows, and hits during it show BLOCKED!
- [ ] Walls block clicks; the wall count matches the table above for each difficulty
- [ ] Zapper on Alien gives +2, the monster freezes, and it jumps away after 1s
- [ ] The game-over screen shows the beaten-up monster
- [ ] On a 1366×650 laptop, everything is visible without scrolling

---

## Step 6d: Changes after the third playtest

This step **replaces some of 6c**: weapons no longer have different rules, and lasers replace the walls.

- **Every weapon is equal:** 1 point per hit. Removed: the Hearts time bonus, the Egg splash area, the Punch auto-move, the Shoe reload, and the Zapper stun and x2 bonus. The weapon cards show only the name.
- **One high score per difficulty**, saved with the player name (`best_easy` etc. in `localStorage`) and shown as "Best: 23 by 💔 Heartbroken".
- **New marks:** egg white splash with drips (no yolk), shoe-sole print, a Sunny Plast style bandage, and a black burn mark with smoke rising (Zapper). The egg hit effect is now an egg-white splash.
- **Lasers instead of walls:** a vertical laser moves right → left, and a horizontal one moves bottom → top. The 28px hit zone includes the glow. Easy: 1 laser after 10 points. Medium: 1, then 2 after 15. Hard: 2, fast. A laser click plays a "fizz" sound.
- **Block items:** Teddy shows arms and paws over its eyes, the Robot a welding mask, the Ex-Boyfriend sunglasses, the Ex-Girlfriend a handbag, and Classic "ghost mode" (see-through + BOO!). The Alien keeps its energy shield. One shared, louder CLANG for every block.
- **Ex-Boyfriend and Ex-Girlfriend** are separate monsters (6 monsters in total).
- **Player name** (top of the left panel): a dropdown of names that match the monster. The defaults are Cuddle Buddy, Hacker, Earthling, The New Me and Glow-Up. Classic gets an avatar picker and a free-text name (default "🕹️ Arcade Hero"). The choice is remembered per monster. It shows as "Player vs Monster" above the game, and on the game-over screen: "💔 Heartbroken hit the Ex-Boyfriend 23 times with Eggs 🥚".

**Test**
- [ ] Every weapon gives exactly 1 point per hit, and the monster only moves when hit
- [ ] Each weapon leaves its own mark, and Zapper marks smoke for a few seconds
- [ ] Lasers: the vertical one moves right → left, the horizontal one bottom → top, and clicks on the glow are blocked
- [ ] All 6 monsters show their block item, and every block plays the same clang
- [ ] Player names: the defaults are correct for each monster, and the choice survives a reload
- [ ] Classic: the chosen avatar and typed name show in the "vs" line, on the game-over screen and next to the high score
- [ ] Each difficulty has its own high score with a name

---

## Step 6e: Player = your own name + optional face & title

This step **replaces the player dropdown from 6d**.

- The left panel has a **name box** with the standard face 🙂 next to it. No name is filled in automatically; an empty name shows as "Player".
- **✨ Face & title** (or clicking the face) opens a popup with:
  - 12 faces to choose from
  - 3 title lines that match the selected monster, written with verbs (e.g. "🌍 Earthling, defending our planet"), plus **No title**, which is the default
- The title is remembered per monster, and the face and name are remembered too.
- Where it shows:
  - above the game: "😎 Marvee  vs  Alien", with the title underneath
  - on the game-over screen: "😎 Marvee hit the Alien 23 times with Eggs 🥚", with the title underneath
  - next to the high score: "Best: 23 by 😎 Marvee"
- The name, face and title can't be changed during a game.

**Test**
- [ ] A fresh visit shows 🙂 and an empty name box, with no title
- [ ] Typing a name updates the "vs" line immediately
- [ ] The popup opens from the button and from the face; Done, Esc and a click outside all close it
- [ ] The titles change when the monster changes, and each monster remembers its own title
- [ ] The name, face and title show on the game-over screen and next to the high score

---

## Step 6f: Opponents popup, one Ex, new Ex-Boss

This step **replaces the face & title popup from 6e**.

- **Monsters:** The Ex is now a single monster (the old Ex-Boyfriend drawing, which blocks with sunglasses). The Ex-Girlfriend is replaced by the **Ex-Boss**: bald head, glasses, mustache and suit. It blocks with a laptop saying "IN A MEETING" with a BUSY! sticky note, and has its own office lines.
- **Popup "Choose your opponent":** one row per monster, showing the opponent's face and name on the left, a neon line marked "hitting" in the middle, and the monster drawing and name on the right. A "Just me, no opponent" row comes first and is the default.
  - 🤠 Monster Hunter → Classic · 🤗 Cuddle Buddy → Teddy · 🧑‍💻 Hacker → Robot · 🧑‍🚀 Earthling → Alien · 😎 The New Me → The Ex · 😤 Fired Employee → Ex-Boss
- Picking an opponent also selects its monster. While playing as an opponent, changing the monster in the panel switches to that monster's opponent.
- The player's face is 🙂, or the opponent's face. It shows as "🧑‍💻 Marvee  vs  Robot", with "🧑‍💻 Hacker hitting the Robot" underneath, on the game-over screen and in "Best: … by 🧑‍💻 Marvee".

**Test**
- [ ] The popup shows 7 rows (Just me + 6), each with the opponent's face, the hitting line and the monster's face
- [ ] Picking a row selects the matching monster card
- [ ] Changing the monster card switches the opponent, and "Just me" goes back to 🙂
- [ ] Ex-Boss: block laptop, office lines, and every mark and face works

---

## Step 6g: "Choose your battle", one matchup line, Trash Bag

This step **replaces the opponent behaviour from 6f**.

- **One line under the title**, e.g. "😎 The New Me  vs  The Ex". The second line is gone.
- **The name box is only for your own name.** Picking a monster by hand shows "🙂 Marvee  vs  Robot".
- **⚔️ Choose your battle** opens a popup with 6 ready-made matchups, with "vs" in the middle. Picking one selects its monster. Picking a different monster by hand afterwards switches back to your own name.
  - 🙂 *your name* vs Classic · 🤗 Best Friend vs Teddy · 🧑‍💻 Hacker vs Robot · 🧑‍🚀 Astronaut vs Alien · 😎 The New Me vs The Ex · 📦 Just Resigned vs Ex-Boss
- Game over shows "📦 Just Resigned (Marvee) hit the Ex-Boss 23 times with the Trash Bag 🗑️". The high score shows "Best: 23 by Marvee".
- **New weapon, 🗑️ Trash Bag** (1 point): a black garbage bag flies in and bursts. Rotten 🍅🥬🧅🥔 fly out, with green stink lines and two buzzing 🪰. It leaves a squashed tomato (with seeds) or green slime that drips. Sound: rustle, SPLAT, plop-plop. Every monster says "EWW!" and similar lines. The 6 weapons sit in a 3 + 3 grid.

**Test**
- [ ] Only one line under the title
- [ ] Typing a name updates "🙂 Name vs Monster"
- [ ] The popup shows 6 rows with "vs"; picking one selects its monster and shows the opponent
- [ ] Choosing another monster by hand switches back to your own name
- [ ] Trash Bag: bag projectile, veggies burst, flies, stink lines, tomato/slime marks, EWW lines, 1 point

---

## Step 6h: Redesign – "Get Even!"

- **The game is renamed "Get Even!"** (title, page tab, link preview, 👊 favicon). The repo name stays `hit-the-monster`.
- **Lasers removed.** Blocking is now the only distraction.
- **3 boxes of equal height:** the left box (now 230px wide) holds the player at the top and the buttons at the bottom; the middle box holds the game; the right box holds the choices. Start and New Game are the same size.
- **Level popup:** the "⚡ Level: Easy" button opens a popup with 🟢 Easy, 🟡 Medium and 🔴 Hard, each with a short description. It closes after you choose.
- **New Game icon** is now 🕹️.
- **Easier-to-read hit messages:** a big comic sound word at the hit point (MUAH! SPLAT! POW! WHACK! BZZZT! SPLOOSH!, in the Bangers font), and a bigger comic speech bubble with a tail that stays for 1.5s.
- **Animated background per battle**, which only moves during a game: Classic = retro grid + stars, Teddy = bedroom at night (clouds, hearts, sparkles), Robot = green code rain + circuit grid, Alien = space + planet + UFO, The Ex = falling 💔 + phone pop-ups ("Seen ✓✓", "u up? 👀"), Ex-Boss = falling papers + email pop-ups ("Reply-all 📧", "URGENT!!!"). In the last 5 seconds the game area pulses red.
- **Game Over popup:** the monster's final face, a personal message (good or low, depending on stars), score, ⭐ rating, rank, a "New high score" banner, and a **local Top 10 per level** (name, battle, score; your row is highlighted). Buttons: Play Again and Change Battle. Zero scores don't go on the list. "Best" in the score bar comes from the Top 10.
- **The monster's replies appear in the left box** (between "Choose your battle" and Start), in a screen that fits the theme. The newest message is highlighted, at most 4 are shown, older ones fade at the top, and every new game starts with an empty screen:
  - Classic: an arcade screen (pink pixel text, blinking LIVE)
  - Teddy: a pink lined note in handwriting (Patrick Hand font)
  - Robot: a laptop terminal (green `> text` and a keyboard base)
  - Alien: an "INCOMING TRANSMISSION" spaceship screen with scanlines
  - The Ex: a phone chat with a notch, grey chat bubbles and "Seen ✓✓"
  - Ex-Boss: an email inbox (From: Ex-Boss, newest marked "now")
- **BLOCKED!** stays a solid red box in the game area.
- **Just Resigned** has a 🧑‍💼 face (shirt and tie) instead of the 📦 box.
- The **Game Over popup has an ✕ close button** in the top-right corner.
- **Later:** a shared online leaderboard (needs a database such as Vercel KV or Supabase).

**Test**
- [ ] The 3 boxes are the same height on a laptop; on a phone they stack
- [ ] The Level popup changes the level, closes, and updates the button
- [ ] Every weapon shows its comic word, and the bubble is easy to read
- [ ] Each monster has its own background, moving only during a game; The Ex and Ex-Boss show pop-ups
- [ ] The last 5 seconds pulse red
- [ ] Game Over popup: the message fits the battle and score, stars match the table, rank and Top 10 are correct, and both buttons work

---

## Step 7: Full regression test before publishing

Run through this checklist with all 4 monsters, all 3 weapons, and all 3 difficulties:

| Check | Chrome desktop | Firefox/Edge | Phone (real device) |
|---|---|---|---|
| Choices save and restore | ☐ | ☐ | ☐ |
| Each weapon's rule works | ☐ | ☐ | ☐ |
| Effects and sounds play | ☐ | ☐ | ☐ |
| Game over and Play Again | ☐ | ☐ | ☐ |
| High score per weapon | ☐ | ☐ | ☐ |
| No horizontal scroll, monster reachable | ☐ | ☐ | ☐ |
| No console errors | ☐ | ☐ | n/a |

To test locally on a phone, run `npx serve .` and open `http://<your-PC-IP>:3000` on the phone, with both devices on the same Wi-Fi.

---

## Step 8: Move to the new GitHub repo `hit-the-monster`

The old repo `MarveeMahmood/catch-the-monster` stays on GitHub untouched. Only the local remote changes.

```bash
# 1. Merge the feature branch
git checkout main
git merge feature/monsters-and-weapons

# 2. Create the new repo on GitHub (public, so Vercel and players can reach it)
gh repo create MarveeMahmood/hit-the-monster --public --description "Pick a monster, pick a weapon, hit it!"

# 3. Point this folder at it (full history is kept)
git remote set-url origin https://github.com/MarveeMahmood/hit-the-monster.git
git remote -v            # verify it shows hit-the-monster

# 4. Push
git push -u origin main
```
If you don't have `gh`, create the repo at github.com/new. Don't add a README there, so the first push doesn't conflict. Then run steps 3 and 4.

**Test**
- [ ] On github.com/MarveeMahmood/hit-the-monster, all commits show, including the old ones
- [ ] The `assets/sounds/*.wav` files are present in the repo

---

## Step 9: Deploy on Vercel

1. Sign in at vercel.com with GitHub.
2. Click **Add New → Project** and import `hit-the-monster`.
3. Use these settings: Framework Preset **Other**, Build Command **empty**, Output Directory **empty** (the root folder).
4. Click **Deploy**. The site is published at `https://hit-the-monster.vercel.app` (or similar).
5. From now on, every `git push` to `main` redeploys automatically, and other branches get preview URLs.

Alternatively, use the CLI: `npx vercel`, then `npx vercel --prod`.

**Test on the live URL**
- [ ] The page loads with no 404 errors in DevTools → Network (especially `script.js` and the `.wav` files, since filename case matters on Vercel)
- [ ] Play one full game per weapon on desktop and on a phone
- [ ] Sharing the link in WhatsApp or Discord shows the title and description
- [ ] Add the live URL to `README.md` and the GitHub repo's "About" section
