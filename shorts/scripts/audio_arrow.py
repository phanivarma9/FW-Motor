# Sound design for GrowthArrow - timings mirror src/videos/GrowthArrow.tsx
import math, sys
sys.path.insert(0, "scripts")
from sfx import *

FPS = 30; DUR = 780 / FPS
pts = [(-0.6,0.08),(1.8,1.4),(2.6,0.7),(4.6,2.4),(5.3,1.7),(7.4,3.6),(8.0,3.0),(8.8,3.9),(12.5,13.2)]
lens = [math.dist(pts[i], pts[i+1]) for i in range(len(pts)-1)]
vd = [sum(lens[:i]) for i in range(len(pts))]
G_START, SPEED, BEHIND = 60, 0.036, 0.75
PRE = vd[-2]; G_END = G_START + (PRE - 0.5) / SPEED; R_END = G_END + 62; REVEAL_END = R_END + 90
rider_frame = lambda u: G_START + (u + BEHIND - 0.5) / SPEED

m = Mix(DUR)
# tense minor pad while grinding, resolves to major on reveal
pad(m, [[57,60,64],[53,57,60],[55,59,62],[52,55,59]], 3.2, until=G_END / FPS)
# footsteps: walk phase = u*3.2, a step each half cycle
u = 0.0; k = 1
while True:
    u = k * math.pi / 3.2
    if u > PRE - BEHIND: break
    seg = max(i for i in range(len(vd)) if vd[i] <= u)
    if seg % 2 == 0 or seg == 7:
        m.add(rider_frame(u) / FPS, tick(1150 + (k % 2) * 180), 0.5)
    k += 1
# setbacks
for s in (1, 3, 5):
    t0 = rider_frame(vd[s]) / FPS
    m.add(t0, drop(), 0.8); m.add(t0 + 0.25, thud(), 0.9)
# tension riser -> breakthrough
m.add(G_END / FPS - 2.0, riser(2.0), 0.7)
m.add(G_END / FPS, whoosh(2.0), 1.0)
m.add(G_END / FPS + 0.05, boom(), 1.0)
# reveal chord + sparkle
m.add((R_END + 5) / FPS, chord([60, 64, 67, 72, 76], 7, 0.07))
m.add((REVEAL_END - 30) / FPS, chord([84, 88, 91], 3, 0.03), pan=0.3)
m.save("public/audio/arrow.wav")
print("ok", round(G_END/FPS,2), [round(rider_frame(vd[s])/FPS,2) for s in (1,3,5)])
