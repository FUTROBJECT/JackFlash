# Add & Subtract — word problems (Group `words`, W1–W3)

**Author:** curriculum agent, 2026-10-06 · **Verified:** main loop by script (arithmetic of every step, ≤1 regroup per operation, every value 0–9,999, unique keys, story numbers match keys, answer ≠ the other operation for 1-step items, answer ≠ step 1 for W3, every sentence ≤12 words, no trade/borrow/carry). All 56 pass.

This file is the source of truth for the `WORD_PROBLEMS` literals in `src/modules/add.jsx`. Item order within each skill is the introduction order. Keys are persisted mastery units: never edit a key once shipped.

Notes from the author:
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
story: Leo has 324 red beads. He has 152 blue beads.
question: How many beads does Leo have in all?
answer: 476
labels: parts: Red beads 324 | Blue beads 152 ; whole: ?
```
```
key: add:wp:part:586-243
skill: W1
kind: part
model: partWhole
story: Mia has 586 stickers. She has 243 star stickers. The rest are heart stickers.
question: How many heart stickers does Mia have?
answer: 343
labels: parts: Star stickers 243 | Heart stickers ? ; whole: 586
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
story: Priya and Omar have 725 shells together. Priya has 461 shells.
question: How many shells does Omar have?
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
story: A shop had 3,895 balloons. It sold 1,640 balloons.
question: How many balloons were left?
answer: 2255
labels: parts: Sold 1640 | Left ? ; whole: 3895
```
```
key: add:wp:whole:5203+3614
skill: W1
kind: whole
model: partWhole
story: A farm grew 5,203 red apples. It grew 3,614 green apples.
question: How many apples did the farm grow in all?
answer: 8817
labels: parts: Red apples 5203 | Green apples 3614 ; whole: ?
```
```
key: add:wp:whole:2456+1327
skill: W1
kind: whole
model: partWhole
story: Zara has 2,456 gold stars. She has 1,327 silver stars.
question: How many stars does Zara have altogether?
answer: 3783
labels: parts: Gold stars 2456 | Silver stars 1327 ; whole: ?
```
```
key: add:wp:part:6385-2147
skill: W1
kind: part
model: partWhole
story: A stadium has 6,385 seats. Of these, 2,147 seats are blue. The rest are red.
question: How many red seats are there?
answer: 4238
labels: parts: Blue seats 2147 | Red seats ? ; whole: 6385
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
story: Sam had 5,460 stamps. He gave 2,830 stamps to his cousin.
question: How many stamps does Sam have left?
answer: 2630
labels: parts: Gave away 2830 | Left ? ; whole: 5460
```
```
key: add:wp:whole:4615+3830
skill: W1
kind: whole
model: partWhole
story: Aisha's class collected 4,615 bottle caps. Noah's class collected 3,830 bottle caps.
question: How many bottle caps did both classes collect altogether?
answer: 8445
labels: parts: Aisha's class 4615 | Noah's class 3830 ; whole: ?
```
```
key: add:wp:part:6254-3182
skill: W1
kind: part
model: partWhole
story: Ravi and Hana used 6,254 blocks to build a city. Ravi used 3,182 of the blocks.
question: How many blocks did Hana use?
answer: 3072
labels: parts: Ravi 3182 | Hana ? ; whole: 6254
```
```
key: add:wp:whole:6509+1284
skill: W1
kind: whole
model: partWhole
story: A garden has 6,509 yellow flowers. It has 1,284 purple flowers.
question: How many flowers are in the garden altogether?
answer: 7793
labels: parts: Yellow flowers 6509 | Purple flowers 1284 ; whole: ?
```
```
key: add:wp:part:6836-2592
skill: W1
kind: left
model: partWhole
story: A bakery made 6,836 cookies for a fair. It sold 2,592 cookies.
question: How many cookies were left?
answer: 4244
labels: parts: Sold 2592 | Left ? ; whole: 6836
```
```
key: add:wp:whole:5347+2425
skill: W1
kind: whole
model: partWhole
story: Mei planted 5,347 corn seeds. She planted 2,425 bean seeds.
question: How many seeds did Mei plant in all?
answer: 7772
labels: parts: Corn seeds 5347 | Bean seeds 2425 ; whole: ?
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
story: Ben has 320 stickers. Mia has 145 more stickers than Ben.
question: How many stickers does Mia have?
answer: 465
labels: bars: Ben 320 | Mia ? ; difference: 145
```
```
key: add:wp:diff:587-352
skill: W2
kind: diff-more
model: comparison
story: Lily has 587 beads. Omar has 352 beads.
question: How many more beads does Lily have than Omar?
answer: 235
labels: bars: Lily 587 | Omar 352 ; difference: ?
```
```
key: add:wp:less:768-235
skill: W2
kind: less
model: comparison
story: Jin has 768 cards. Ella has 235 fewer cards than Jin.
question: How many cards does Ella have?
answer: 533
labels: bars: Jin 768 | Ella ? ; difference: 235
```
```
key: add:wp:more:456+227
skill: W2
kind: more
model: comparison
story: Kofi scored 456 points in a game. Nora scored 227 more points than Kofi.
question: How many points did Nora score?
answer: 683
labels: bars: Kofi 456 | Nora ? ; difference: 227
```
```
key: add:wp:diff:814-352
skill: W2
kind: diff-more
model: comparison
story: The red train had 814 riders. The blue train had 352 riders.
question: How many more riders did the red train have than the blue?
answer: 462
labels: bars: Red train 814 | Blue train 352 ; difference: ?
```
```
key: add:wp:more:2130+1415
skill: W2
kind: more
model: comparison
story: Diego has 2,130 stamps. Ruby has 1,415 more stamps than Diego.
question: How many stamps does Ruby have?
answer: 3545
labels: bars: Diego 2130 | Ruby ? ; difference: 1415
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
story: Luis has 5,742 marbles. Amir has 1,325 fewer marbles than Luis.
question: How many marbles does Amir have?
answer: 4417
labels: bars: Luis 5742 | Amir ? ; difference: 1325
```
```
key: add:wp:less:642-218
skill: W2
kind: trap
model: comparison
story: Sofia has 642 shells. She has 218 more shells than Theo.
question: How many shells does Theo have?
answer: 424
labels: bars: Sofia 642 | Theo ? ; difference: 218
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
key: add:wp:more:4580+1270
skill: W2
kind: more
model: comparison
story: A farm has 4,580 chickens. It has 1,270 more ducks than chickens.
question: How many ducks does the farm have?
answer: 5850
labels: bars: Chickens 4580 | Ducks ? ; difference: 1270
```
```
key: add:wp:less:3625-1408
skill: W2
kind: trap
model: comparison
story: Felix has 3,625 stickers. He has 1,408 more stickers than Yuki.
question: How many stickers does Yuki have?
answer: 2217
labels: bars: Felix 3625 | Yuki ? ; difference: 1408
```
```
key: add:wp:less:6460-2830
skill: W2
kind: less
model: comparison
story: The big pond has 6,460 fish. The small pond has 2,830 fewer fish.
question: How many fish are in the small pond?
answer: 3630
labels: bars: Big pond 6460 | Small pond ? ; difference: 2830
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
key: add:wp:more:3148+2705
skill: W2
kind: more
model: comparison
story: Arjun has 3,148 blocks. Jade has 2,705 more blocks than Arjun.
question: How many blocks does Jade have?
answer: 5853
labels: bars: Arjun 3148 | Jade ? ; difference: 2705
```
```
key: add:wp:less:4350-1820
skill: W2
kind: trap
model: comparison
story: Owen planted 4,350 seeds. He planted 1,820 more seeds than Nia.
question: How many seeds did Nia plant?
answer: 2530
labels: bars: Owen 4350 | Nia ? ; difference: 1820
```
```
key: add:wp:diff:8416-1293
skill: W2
kind: diff-more
model: comparison
story: The fair had 8,416 visitors on Saturday. It had 1,293 visitors on Sunday.
question: How many more visitors came on Saturday than on Sunday?
answer: 7123
labels: bars: Saturday 8416 | Sunday 1293 ; difference: ?
```
```
key: add:wp:more:1574+1362
skill: W2
kind: more
model: comparison
story: Kai has 1,574 beads. Zoe has 1,362 more beads than Kai.
question: How many beads does Zoe have?
answer: 2936
labels: bars: Kai 1574 | Zoe ? ; difference: 1362
```
```
key: add:wp:less:6205-2140
skill: W2
kind: trap
model: comparison
story: A shop sold 6,205 pencils. It sold 2,140 more pencils than erasers.
question: How many erasers did the shop sell?
answer: 4065
labels: bars: Pencils 6205 | Erasers ? ; difference: 2140
```

## W3 — Two steps (16)

```
key: add:wp:two:485-132+210
skill: W3
kind: two-change
model: two
story: Leo had 485 stickers. He gave 132 stickers to his sister. Then he bought 210 more stickers.
question: How many stickers does Leo have now?
answer: 563
step1: 485 - 132 = 353
step2: 353 + 210 = 563
labels: 1) parts: Gave away 132 | Left ? ; whole: 485 // 2) parts: Left [step 1] | Bought 210 ; whole: ?
```
```
key: add:wp:two:213+142+213
skill: W3
kind: two-compare-whole
model: two
story: Ava has 213 beads. Mei has 142 more beads than Ava.
question: How many beads do they have altogether?
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
story: A shop had 650 pens. It sold 280 pens. Then 145 more pens came in.
question: How many pens does the shop have now?
answer: 515
step1: 650 - 280 = 370
step2: 370 + 145 = 515
labels: 1) parts: Sold 280 | Left ? ; whole: 650 // 2) parts: Left [step 1] | Came in 145 ; whole: ?
```
```
key: add:wp:two:236+118+236
skill: W3
kind: two-compare-whole
model: two
story: Ezra has 236 cards. Grace has 118 more cards than Ezra.
question: How many cards do they have in all?
answer: 590
step1: 236 + 118 = 354
step2: 236 + 354 = 590
labels: 1) bars: Ezra 236 | Grace ? ; difference: 118 // 2) parts: Ezra 236 | Grace [step 1] ; whole: ?
```
```
key: add:wp:two:750-240-240
skill: W3
kind: two-whole-compare
model: two
story: Rosa and Ali have 750 marbles together. Rosa has 240 marbles.
question: How many more marbles does Ali have than Rosa?
answer: 270
step1: 750 - 240 = 510
step2: 510 - 240 = 270
labels: 1) parts: Rosa 240 | Ali ? ; whole: 750 // 2) bars: Ali [step 1] | Rosa 240 ; difference: ?
```
```
key: add:wp:two:3460-1230+2105
skill: W3
kind: two-change
model: two
story: A sports shop had 3,460 tennis balls. It sold 1,230 tennis balls. Then it got 2,105 more tennis balls.
question: How many tennis balls does the shop have now?
answer: 4335
step1: 3460 - 1230 = 2230
step2: 2230 + 2105 = 4335
labels: 1) parts: Sold 1230 | Left ? ; whole: 3460 // 2) parts: Left [step 1] | Got 2105 ; whole: ?
```
```
key: add:wp:two:2130+1240+2130
skill: W3
kind: two-compare-whole
model: two
story: Hana collected 2,130 shells. Kofi collected 1,240 more shells than Hana.
question: How many shells did they collect altogether?
answer: 5500
step1: 2130 + 1240 = 3370
step2: 2130 + 3370 = 5500
labels: 1) bars: Hana 2130 | Kofi ? ; difference: 1240 // 2) parts: Hana 2130 | Kofi [step 1] ; whole: ?
```
```
key: add:wp:two:5250-1630+2415
skill: W3
kind: two-change
model: two
story: Amir had 5,250 stamps. He gave 1,630 stamps to a friend. Then he got 2,415 more stamps.
question: How many stamps does Amir have now?
answer: 6035
step1: 5250 - 1630 = 3620
step2: 3620 + 2415 = 6035
labels: 1) parts: Gave away 1630 | Left ? ; whole: 5250 // 2) parts: Left [step 1] | Got 2415 ; whole: ?
```
```
key: add:wp:two:1425+1318+1425
skill: W3
kind: two-compare-whole
model: two
story: Wei folded 1,425 paper stars. Lena folded 1,318 more stars than Wei.
question: How many stars did they fold altogether?
answer: 4168
step1: 1425 + 1318 = 2743
step2: 1425 + 2743 = 4168
labels: 1) bars: Wei 1425 | Lena ? ; difference: 1318 // 2) parts: Wei 1425 | Lena [step 1] ; whole: ?
```
```
key: add:wp:two:4860-1520-1520
skill: W3
kind: two-whole-compare
model: two
story: Isla and Max sold 4,860 tickets together. Isla sold 1,520 tickets.
question: How many more tickets did Max sell than Isla?
answer: 1820
step1: 4860 - 1520 = 3340
step2: 3340 - 1520 = 1820
labels: 1) parts: Isla 1520 | Max ? ; whole: 4860 // 2) bars: Max [step 1] | Isla 1520 ; difference: ?
```
```
key: add:wp:two:2145+1320-1280
skill: W3
kind: two-change
model: two
story: Nora had 2,145 beads. She bought 1,320 more beads. Then she used 1,280 beads to make bracelets.
question: How many beads does Nora have now?
answer: 2185
step1: 2145 + 1320 = 3465
step2: 3465 - 1280 = 2185
labels: 1) parts: Had 2145 | Bought 1320 ; whole: ? // 2) parts: Used 1280 | Left ? ; whole: [step 1]
```
```
key: add:wp:two:4250-1630+4250
skill: W3
kind: two-compare-whole
model: two
story: Tom has 4,250 cards. Ana has 1,630 fewer cards than Tom.
question: How many cards do they have altogether?
answer: 6870
step1: 4250 - 1630 = 2620
step2: 4250 + 2620 = 6870
labels: 1) bars: Tom 4250 | Ana ? ; difference: 1630 // 2) parts: Tom 4250 | Ana [step 1] ; whole: ?
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
story: A farm had 7,325 seeds. The farmer planted 2,140 seeds. Then she bought 1,608 more seeds.
question: How many seeds does the farmer have now?
answer: 6793
step1: 7325 - 2140 = 5185
step2: 5185 + 1608 = 6793
labels: 1) parts: Planted 2140 | Left ? ; whole: 7325 // 2) parts: Left [step 1] | Bought 1608 ; whole: ?
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
story: Yuki and Ivan have 8,950 stickers together. Yuki has 3,725 stickers.
question: How many more stickers does Ivan have than Yuki?
answer: 1500
step1: 8950 - 3725 = 5225
step2: 5225 - 3725 = 1500
labels: 1) parts: Yuki 3725 | Ivan ? ; whole: 8950 // 2) bars: Ivan [step 1] | Yuki 3725 ; difference: ?
```
