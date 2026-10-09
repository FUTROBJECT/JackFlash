# Add & Subtract — word problems (Group `words`, W1–W3)

**Author:** curriculum agent, 2026-10-06 · **Verified:** main loop by script (arithmetic of every step, ≤1 regroup per operation, every value 0–9,999, unique keys, story numbers match keys, answer ≠ the other operation for 1-step items, answer ≠ step 1 for W3, every sentence ≤12 words, no trade/borrow/carry). All 56 pass.

**Revised 2026-10-09 (Adam's realism review).** Every story must be something a kid meets in real life, or a real fact that sparks curiosity, never a random pile of this or that. Two review rounds: 13 stories kept, 21 rewritten in a kid's own world with the same numbers (keys and progress unchanged), and 22 replaced with real facts (landmarks, planets, mountains, the human body, baseball records, two LEGO sets) or real St. Louis places (Gateway Arch, Busch Stadium, CITYPARK, City Museum, the zoo, Steinberg Rink, the rivers). 14 of the replacements needed new numbers, so they have new keys. Each fact-based story carries a `source:` line; where the place is real but the day's numbers are invented, the source line says so. Facts may use units (feet, meters, miles) when both amounts share the unit. Numbers stay under 10,000 (P3), so a real figure over that, like CITYPARK's 22,423 seats, is reframed to part of the whole. All 56 re-verified by script and by the DEV self-check.

This file is the source of truth for the `WORD_PROBLEMS` literals in `src/modules/add.jsx`. Item order within each skill is the introduction order. Keys are persisted mastery units: never edit a key once shipped.

Notes from the author:
- **Realism rule:** a new story uses a real fact (with a `source:` line) or a real setting a kid would recognize. No collections no kid owns (5,742 marbles), no counting what nobody counts (6,509 flowers).
- The spec's worked-example keys `add:wp:whole:2456+1378` and `add:wp:part:3000-1265` break the ≤1-regroup rule, so they are not in the pool (`2456+1327` is used instead). `1250-480+200` in §9.2 stays as an illustration only.
- Two of the six comparison-then-whole items (W3) are "fewer" stories.
- In W3 labels, `[step 1]` stands for the step-1 result: shown as "?" (or blank) before the answer, filled with the number only in the reveal.
- W2 items of kind `trap` use the `add:wp:less:` key and carry `trap: true`.

## W1 — Part-whole, 1 step (20)

```
key: add:wp:whole:324+152
skill: W1
kind: whole
model: partWhole
story: Leo built a castle with 324 bricks. Then he built a ship with 152 bricks.
question: How many bricks did Leo use in all?
answer: 476
labels: parts: Castle 324 | Ship 152 ; whole: ?
```
```
key: add:wp:part:586-243
skill: W1
kind: part
model: partWhole
story: Mia's school has 586 students. Of these, 243 ride the bus. The rest walk or come by car.
question: How many students do not ride the bus?
answer: 343
labels: parts: Bus 243 | Walk or car ? ; whole: 586
```
```
key: add:wp:whole:438+247
skill: W1
kind: whole
model: partWhole
story: A library has 438 picture books. It has 247 comic books.
question: How many picture books and comic books are there altogether?
answer: 685
labels: parts: Picture books 438 | Comic books 247 ; whole: ?
```
```
key: add:wp:part:652-318
skill: W1
kind: left
model: partWhole
story: A farm stand had 652 apples. It sold 318 apples.
question: How many apples were left?
answer: 334
labels: parts: Sold 318 | Left ? ; whole: 652
```
```
key: add:wp:whole:563+284
skill: W1
kind: whole
model: partWhole
story: The zoo had 563 visitors on Saturday. It had 284 visitors on Sunday.
question: How many visitors came on the two days in all?
answer: 847
labels: parts: Saturday 563 | Sunday 284 ; whole: ?
```
```
key: add:wp:part:725-461
skill: W1
kind: part
model: partWhole
story: Priya and Omar scored 725 points together in a game. Priya scored 461 points.
question: How many points did Omar score?
answer: 264
labels: parts: Priya 461 | Omar ? ; whole: 725
```
```
key: add:wp:whole:2345+1432
skill: W1
kind: whole
model: partWhole
story: Kenji read 2,345 pages last year. He read 1,432 pages this year.
question: How many pages did Kenji read altogether?
answer: 3777
labels: parts: Last year 2345 | This year 1432 ; whole: ?
```
```
key: add:wp:part:4678-2351
skill: W1
kind: part
model: partWhole
story: A school has 4,678 books. Of these, 2,351 are storybooks. The rest are science books.
question: How many science books does the school have?
answer: 2327
labels: parts: Storybooks 2351 | Science books ? ; whole: 4678
```
```
key: add:wp:part:3895-1640
skill: W1
kind: left
model: partWhole
story: Dad's phone had 3,895 photos. He deleted 1,640 blurry photos.
question: How many photos are left on Dad's phone?
answer: 2255
labels: parts: Deleted 1640 | Left ? ; whole: 3895
```
```
key: add:wp:whole:5203+3614
skill: W1
kind: whole
model: partWhole
story: Grandma walked 5,203 steps on Saturday. She walked 3,614 steps on Sunday.
question: How many steps did Grandma walk on the two days?
answer: 8817
labels: parts: Saturday 5203 | Sunday 3614 ; whole: ?
```
```
key: add:wp:whole:2456+1327
skill: W1
kind: whole
model: partWhole
story: Zara has 2,456 gems in her video game. Then she earns 1,327 gems on a new level.
question: How many gems does Zara have now?
answer: 3783
labels: parts: Had 2456 | Earned 1327 ; whole: ?
```
```
key: add:wp:part:6385-2147
skill: W1
kind: part
model: partWhole
story: St. Louis CITY SC plays soccer at CITYPARK. At one game, 6,385 fans sat in the top deck. Of these, 2,147 were kids.
question: How many grown-ups sat in the top deck?
answer: 4238
labels: parts: Kids 2147 | Grown-ups ? ; whole: 6385
source: CITYPARK: two tiers of seats, 22,423 in all (Wikipedia).
```
```
key: add:wp:whole:3742+2165
skill: W1
kind: whole
model: partWhole
story: A fair sold 3,742 tickets on Friday. It sold 2,165 tickets on Saturday.
question: How many tickets did the fair sell in all?
answer: 5907
labels: parts: Friday 3742 | Saturday 2165 ; whole: ?
```
```
key: add:wp:part:5460-2830
skill: W1
kind: left
model: partWhole
story: A pumpkin patch grew 5,460 pumpkins. Families picked 2,830 of them in October.
question: How many pumpkins were left?
answer: 2630
labels: parts: Picked 2830 | Left ? ; whole: 5460
```
```
key: add:wp:whole:4615+3830
skill: W1
kind: whole
model: partWhole
story: Aisha's class read 4,615 pages in the read-a-thon. Noah's class read 3,830 pages.
question: How many pages did both classes read altogether?
answer: 8445
labels: parts: Aisha's class 4615 | Noah's class 3830 ; whole: ?
```
```
key: add:wp:part:6254-3182
skill: W1
kind: part
model: partWhole
story: Ravi and Hana built a brick city with 6,254 bricks. Ravi put in 3,182 of the bricks.
question: How many bricks did Hana put in?
answer: 3072
labels: parts: Ravi 3182 | Hana ? ; whole: 6254
```
```
key: add:wp:whole:6509+1284
skill: W1
kind: whole
model: partWhole
story: On race day, 6,509 people ran the long race. Another 1,284 people ran the kids' race.
question: How many runners were there altogether?
answer: 7793
labels: parts: Long race 6509 | Kids' race 1284 ; whole: ?
```
```
key: add:wp:part:2340-1180
skill: W1
kind: left
model: partWhole
story: The Mississippi River is 2,340 miles long. Rosa's aunt is paddling the whole river in a canoe. So far, she has paddled 1,180 miles.
question: How many miles does she have left to paddle?
answer: 1160
labels: parts: Paddled 1180 | Left ? ; whole: 2340
source: Mississippi River: 2,340 miles (USGS Water Science School).
```
```
key: add:wp:whole:5347+2425
skill: W1
kind: whole
model: partWhole
story: Mei scored 5,347 points in round one of a game. She scored 2,425 points in round two.
question: How many points did Mei score in all?
answer: 7772
labels: parts: Round one 5347 | Round two 2425 ; whole: ?
```
```
key: add:wp:part:8175-1640
skill: W1
kind: part
model: partWhole
story: A museum had 8,175 visitors in May. Of these, 1,640 were adults. The rest were children.
question: How many children visited the museum in May?
answer: 6535
labels: parts: Adults 1640 | Children ? ; whole: 8175
```

## W2 — Comparison, 1 step (20)

```
key: add:wp:more:320+145
skill: W2
kind: more
model: comparison
story: Ben's book has 320 pages. Mia's book has 145 more pages than Ben's.
question: How many pages are in Mia's book?
answer: 465
labels: bars: Ben 320 | Mia ? ; difference: 145
```
```
key: add:wp:diff:762-703
skill: W2
kind: diff-more
model: comparison
story: Barry Bonds hit 762 home runs, the most ever. Albert Pujols hit 703 home runs.
question: How many more home runs did Bonds hit than Pujols?
answer: 59
labels: bars: Bonds 762 | Pujols 703 ; difference: ?
source: Bonds 762, Pujols 703 career home runs (MLB.com, 700 Home Run Club).
```
```
key: add:wp:less:555-250
skill: W2
kind: less
model: comparison
story: The Washington Monument is 555 feet tall. The Statue of Liberty is 250 feet shorter.
question: How tall is the Statue of Liberty?
answer: 305
labels: bars: Monument 555 | Statue ? ; difference: 250
source: Washington Monument 555 ft; Statue of Liberty 305 ft ground to torch (NPS).
```
```
key: add:wp:more:330+498
skill: W2
kind: more
model: comparison
story: The Eiffel Tower is 330 meters tall. The Burj Khalifa in Dubai is 498 meters taller.
question: How tall is the Burj Khalifa?
answer: 828
labels: bars: Eiffel Tower 330 | Burj Khalifa ? ; difference: 498
source: Eiffel Tower 330 m (toureiffel.paris); Burj Khalifa 828 m.
```
```
key: add:wp:diff:814-352
skill: W2
kind: diff-more
model: comparison
story: The roller coaster had 814 riders on Saturday. It had 352 riders on Monday.
question: How many more riders were there on Saturday than on Monday?
answer: 462
labels: bars: Saturday 814 | Monday 352 ; difference: ?
```
```
key: add:wp:more:674+902
skill: W2
kind: more
model: comparison
story: Visitors can climb 674 steps up the Eiffel Tower. The Empire State Building race has 902 more steps.
question: How many steps are in the Empire State Building race?
answer: 1576
labels: bars: Eiffel Tower 674 | Empire State ? ; difference: 902
source: Eiffel Tower 674 steps to floor 2 (toureiffel.paris); Empire State Run-Up 1,576 stairs (esbnyc.com).
```
```
key: add:wp:diff:4867-2543
skill: W2
kind: diff-fewer
model: comparison
story: Hill School has 4,867 library books. Park School has 2,543 library books.
question: How many fewer books does Park School have than Hill School?
answer: 2324
labels: bars: Hill School 4867 | Park School 2543 ; difference: ?
```
```
key: add:wp:less:5742-1325
skill: W2
kind: less
model: comparison
story: Luis walked 5,742 steps on Monday. Amir walked 1,325 fewer steps than Luis.
question: How many steps did Amir walk?
answer: 4417
labels: bars: Luis 5742 | Amir ? ; difference: 1325
```
```
key: add:wp:less:630-25
skill: W2
kind: trap
model: comparison
trap: true
story: The Gateway Arch is 630 feet tall. It is 25 feet taller than the Space Needle.
question: How tall is the Space Needle?
answer: 605
labels: bars: Gateway Arch 630 | Space Needle ? ; difference: 25
source: Gateway Arch 630 ft (NPS); Space Needle 605 ft.
```
```
key: add:wp:more:3264+2519
skill: W2
kind: more
model: comparison
story: A zoo had 3,264 visitors on Monday. On Tuesday, it had 2,519 more visitors than on Monday.
question: How many visitors came on Tuesday?
answer: 5783
labels: bars: Monday 3264 | Tuesday ? ; difference: 2519
```
```
key: add:wp:diff:5893-3417
skill: W2
kind: diff-more
model: comparison
story: Ines won 5,893 tickets at the arcade. Dev won 3,417 tickets.
question: How many more tickets did Ines win than Dev?
answer: 2476
labels: bars: Ines 5893 | Dev 3417 ; difference: ?
```
```
key: add:wp:more:3630+141
skill: W2
kind: more
model: comparison
story: Stan Musial got 3,630 hits for the St. Louis Cardinals. Hank Aaron got 141 more hits than Musial.
question: How many hits did Hank Aaron get?
answer: 3771
labels: bars: Musial 3630 | Aaron ? ; difference: 141
source: Musial 3,630 hits (Baseball Hall of Fame); Aaron 3,771.
```
```
key: add:wp:less:3625-1408
skill: W2
kind: trap
model: comparison
trap: true
story: Felix's tablet has 3,625 photos. It has 1,408 more photos than Yuki's tablet.
question: How many photos are on Yuki's tablet?
answer: 2217
labels: bars: Felix 3625 | Yuki ? ; difference: 1408
```
```
key: add:wp:less:8849-2659
skill: W2
kind: less
model: comparison
story: Mount Everest is 8,849 meters tall. Denali, in Alaska, is 2,659 meters shorter.
question: How tall is Denali?
answer: 6190
labels: bars: Everest 8849 | Denali ? ; difference: 2659
source: Everest 8,849 m; Denali 6,190 m.
```
```
key: add:wp:diff:5182-3951
skill: W2
kind: diff-fewer
model: comparison
story: Hugo's school sold 5,182 raffle tickets. Lucy's school sold 3,951 raffle tickets.
question: How many fewer tickets did Lucy's school sell than Hugo's?
answer: 1231
labels: bars: Hugo's school 5182 | Lucy's school 3951 ; difference: ?
```
```
key: add:wp:more:6020+3070
skill: W2
kind: more
model: comparison
story: The LEGO Hogwarts Castle set has 6,020 pieces. The LEGO Titanic set has 3,070 more pieces.
question: How many pieces does the LEGO Titanic set have?
answer: 9090
labels: bars: Hogwarts 6020 | Titanic ? ; difference: 3070
source: Hogwarts Castle 71043: 6,020 pieces; Titanic 10294: 9,090 pieces (Brick Fanatics).
```
```
key: add:wp:less:4350-1820
skill: W2
kind: trap
model: comparison
trap: true
story: Owen's school collected 4,350 cans for the food drive. That is 1,820 more cans than Nia's school.
question: How many cans did Nia's school collect?
answer: 2530
labels: bars: Owen 4350 | Nia ? ; difference: 1820
```
```
key: add:wp:diff:8416-1293
skill: W2
kind: diff-more
model: comparison
story: The fair had 8,416 visitors on Saturday. It rained on Sunday, and 1,293 people came.
question: How many more visitors came on Saturday than on Sunday?
answer: 7123
labels: bars: Saturday 8416 | Sunday 1293 ; difference: ?
```
```
key: add:wp:more:3032+1180
skill: W2
kind: more
model: comparison
story: Mercury is 3,032 miles across. Mars is 1,180 miles wider than Mercury.
question: How many miles across is Mars?
answer: 4212
labels: bars: Mercury 3032 | Mars ? ; difference: 1180
source: Mercury 3,032 mi, Mars 4,212 mi across (NASA radii x 2).
```
```
key: add:wp:less:7918-397
skill: W2
kind: trap
model: comparison
trap: true
story: Earth is 7,918 miles across. It is 397 miles wider than Venus.
question: How many miles across is Venus?
answer: 7521
labels: bars: Earth 7918 | Venus ? ; difference: 397
source: Earth 7,918 mi, Venus 7,521 mi across (NASA).
```

## W3 — Two steps (16)

```
key: add:wp:two:485-132+210
skill: W3
kind: two-change
model: two
story: A hot dog stand at Busch Stadium had 485 hot dogs. It sold 132 in the first inning. Then the cooks made 210 more.
question: How many hot dogs does the stand have now?
answer: 563
step1: 485 - 132 = 353
step2: 353 + 210 = 563
labels: 1) parts: Sold 132 | Left ? ; whole: 485 // 2) parts: Left [step 1] | Made 210 ; whole: ?
source: Event numbers are made up; Busch Stadium is real.
```
```
key: add:wp:two:213+142+213
skill: W3
kind: two-compare-whole
model: two
story: Ava read 213 pages this week. Mei read 142 more pages than Ava.
question: How many pages did they read altogether?
answer: 568
step1: 213 + 142 = 355
step2: 213 + 355 = 568
labels: 1) bars: Ava 213 | Mei ? ; difference: 142 // 2) parts: Ava 213 | Mei [step 1] ; whole: ?
```
```
key: add:wp:two:650-280+145
skill: W3
kind: two-change
model: two
story: The houses on Elm Street had 650 pieces of Halloween candy. Trick-or-treaters took 280 pieces before dark. Then the neighbors bought 145 more pieces.
question: How many pieces of candy do they have now?
answer: 515
step1: 650 - 280 = 370
step2: 370 + 145 = 515
labels: 1) parts: Taken 280 | Left ? ; whole: 650 // 2) parts: Left [step 1] | Bought 145 ; whole: ?
source: Event numbers are made up.
```
```
key: add:wp:two:162+53+162
skill: W3
kind: two-compare-whole
model: two
story: From the pedestal, 162 steps lead to the Statue of Liberty's crown. The stairs up to the pedestal have 53 more steps than that.
question: How many steps are there from the ground to the crown?
answer: 377
step1: 162 + 53 = 215
step2: 162 + 215 = 377
labels: 1) bars: Crown stairs 162 | Pedestal stairs ? ; difference: 53 // 2) parts: Crown stairs 162 | Pedestal stairs [step 1] ; whole: ?
source: 162 steps pedestal to crown (NPS); 215 to the pedestal (NPR); 377 in all.
```
```
key: add:wp:two:206-106-100
skill: W3
kind: two-whole-compare
model: two
story: An adult has 206 bones. The hands and feet have 106 of them!
question: How many more bones are in the hands and feet than elsewhere?
answer: 6
step1: 206 - 106 = 100
step2: 106 - 100 = 6
labels: 1) parts: Hands and feet 106 | Rest of body ? ; whole: 206 // 2) bars: Hands and feet 106 | Rest of body [step 1] ; difference: ?
source: 206 bones; 27 per hand, 26 per foot = 106 (Wikipedia, list of bones).
```
```
key: add:wp:two:3460-1230+2105
skill: W3
kind: two-change
model: two
story: The town library had 3,460 books. It gave away 1,230 old books. Then it got 2,105 new books.
question: How many books does the library have now?
answer: 4335
step1: 3460 - 1230 = 2230
step2: 2230 + 2105 = 4335
labels: 1) parts: Gave away 1230 | Left ? ; whole: 3460 // 2) parts: Left [step 1] | New books 2105 ; whole: ?
```
```
key: add:wp:two:2130+1240+2130
skill: W3
kind: two-compare-whole
model: two
story: On Saturday, 2,130 people skated at Steinberg Rink in Forest Park. On Sunday, 1,240 more people skated than on Saturday.
question: How many people skated on the two days?
answer: 5500
step1: 2130 + 1240 = 3370
step2: 2130 + 3370 = 5500
labels: 1) bars: Saturday 2130 | Sunday ? ; difference: 1240 // 2) parts: Saturday 2130 | Sunday [step 1] ; whole: ?
source: Event numbers are made up; Steinberg Rink is real.
```
```
key: add:wp:two:5250-1630+2415
skill: W3
kind: two-change
model: two
story: Bird watchers counted 5,250 white pelicans on the river near St. Louis. Then 1,630 pelicans flew south. Later, 2,415 more pelicans landed.
question: How many pelicans are on the river now?
answer: 6035
step1: 5250 - 1630 = 3620
step2: 3620 + 2415 = 6035
labels: 1) parts: Flew south 1630 | Stayed ? ; whole: 5250 // 2) parts: Stayed [step 1] | Landed 2415 ; whole: ?
source: Event numbers are made up; the migration is real (NPS, Riverlands).
```
```
key: add:wp:two:1425+1318+1425
skill: W3
kind: two-compare-whole
model: two
story: On Friday, 1,425 kids zoomed down the ten-story slide at City Museum. On Saturday, 1,318 more kids slid down than on Friday.
question: How many kids went down the slide on the two days?
answer: 4168
step1: 1425 + 1318 = 2743
step2: 1425 + 2743 = 4168
labels: 1) bars: Friday 1425 | Saturday ? ; difference: 1318 // 2) parts: Friday 1425 | Saturday [step 1] ; whole: ?
source: Event numbers are made up; the slide is real (City Museum).
```
```
key: add:wp:two:4860-1520-1520
skill: W3
kind: two-whole-compare
model: two
story: One day, 4,860 people rode the trams up the Gateway Arch. Of these, 1,520 were kids.
question: How many more grown-ups than kids rode the trams?
answer: 1820
step1: 4860 - 1520 = 3340
step2: 3340 - 1520 = 1820
labels: 1) parts: Kids 1520 | Grown-ups ? ; whole: 4860 // 2) bars: Grown-ups [step 1] | Kids 1520 ; difference: ?
source: Event numbers are made up; tram capacity from the Gateway Arch fact sheet.
```
```
key: add:wp:two:2145+1320-1280
skill: W3
kind: two-change
model: two
story: Nora had 2,145 beads. She bought a tub of 1,320 more beads. Then she used 1,280 beads to make a bead picture.
question: How many beads does Nora have now?
answer: 2185
step1: 2145 + 1320 = 3465
step2: 3465 - 1280 = 2185
labels: 1) parts: Had 2145 | Bought 1320 ; whole: ? // 2) parts: Used 1280 | Left ? ; whole: [step 1]
```
```
key: add:wp:two:2540-200+2540
skill: W3
kind: two-compare-whole
model: two
story: The Missouri River is 2,540 miles long. The Mississippi River is 200 miles shorter. The two rivers meet near St. Louis.
question: How many miles long are the two rivers altogether?
answer: 4880
step1: 2540 - 200 = 2340
step2: 2540 + 2340 = 4880
labels: 1) bars: Missouri 2540 | Mississippi ? ; difference: 200 // 2) parts: Missouri 2540 | Mississippi [step 1] ; whole: ?
source: Missouri 2,540 mi, Mississippi 2,340 mi (USGS list). Other sources differ a little.
```
```
key: add:wp:two:6480-2150-2150
skill: W3
kind: two-whole-compare
model: two
story: A zoo had 6,480 visitors on the weekend. Of these, 2,150 came on Saturday. The rest came on Sunday.
question: How many more visitors came on Sunday than on Saturday?
answer: 2180
step1: 6480 - 2150 = 4330
step2: 4330 - 2150 = 2180
labels: 1) parts: Saturday 2150 | Sunday ? ; whole: 6480 // 2) bars: Sunday [step 1] | Saturday 2150 ; difference: ?
```
```
key: add:wp:two:7325-2140+1608
skill: W3
kind: two-change
model: two
story: At noon, 7,325 people were at the Saint Louis Zoo. Later, 2,140 people went home. Then 1,608 more people came in.
question: How many people are at the zoo now?
answer: 6793
step1: 7325 - 2140 = 5185
step2: 5185 + 1608 = 6793
labels: 1) parts: Went home 2140 | Stayed ? ; whole: 7325 // 2) parts: Stayed [step 1] | Came in 1608 ; whole: ?
source: Event numbers are made up; the zoo gets about 3 million visitors a year.
```
```
key: add:wp:two:5370-1450+5370
skill: W3
kind: two-compare-whole
model: two
story: A school has 5,370 crayons. It has 1,450 fewer markers than crayons.
question: How many crayons and markers does the school have altogether?
answer: 9290
step1: 5370 - 1450 = 3920
step2: 5370 + 3920 = 9290
labels: 1) bars: Crayons 5370 | Markers ? ; difference: 1450 // 2) parts: Crayons 5370 | Markers [step 1] ; whole: ?
```
```
key: add:wp:two:8950-3725-3725
skill: W3
kind: two-whole-compare
model: two
story: Yuki's class and Ivan's class read 8,950 pages in the read-a-thon. Yuki's class read 3,725 pages.
question: How many more pages did Ivan's class read than Yuki's class?
answer: 1500
step1: 8950 - 3725 = 5225
step2: 5225 - 3725 = 1500
labels: 1) parts: Yuki's class 3725 | Ivan's class ? ; whole: 8950 // 2) bars: Ivan's class [step 1] | Yuki's class 3725 ; difference: ?
```
