# Debunk Flat Earth

Three small interactive pages that test ideas about the shape of the Earth and how it moves, using simple geometry. Each page has sliders and editable numbers, so you can try the flat-earth or Earth-centred version yourself and see where it breaks.

Open `index.html` in any web browser to start. The pages link to each other in the top-right corner.

---

## 1. The Moon stays the same size all night (`index.html`)

**The claim being tested:** the Earth is flat, and the Moon circles above it at a fixed height (usually said to be about 4,800 km up).

**In plain English:**
If the Moon were a small object floating 4,800 km above a flat Earth, it would look big when it is overhead and much smaller when it is far away near the horizon, the same way a plane looks smaller as it flies away from you. Near the horizon it should shrink to a dot. It should also never actually set, because something at a fixed height above a flat surface never drops below a certain angle.

What we really see is different. Photos taken through the night show the Moon stays the same size from moonrise to moonset, and it does set below the horizon. That only works if the Moon is very far away (about 384,000 km) and the Earth is a globe.

**The math:**
- For the Moon to appear at an angle α above the horizon, a flat-earth Moon at height h must be a distance `d = h / sin α` away.
- Its apparent size is `θ = 2 · arctan(r / d)`, so on a flat Earth the size falls with sin α and reaches zero at the horizon.
- On a globe, the Moon's distance changes by at most one Earth radius out of 384,000 km, so its size changes by only about 1.5%.

---

## 2. Venus goes around the Sun (`venus.html`)

**The claim being tested:** everything, including Venus and the Sun, goes around the Earth (Ptolemy's model).

**In plain English:**
Venus, like the Moon, has phases: sometimes we see it fully lit, sometimes as a thin crescent. Venus can only look full when the Sun is lighting it from behind, as seen from us. That only happens when Venus is on the far side of the Sun.

In the Earth-centred model, Venus is always between us and the Sun, so we would mostly see its dark side, and it could never look full. Through a telescope, Venus does look full, and it looks full exactly when it is smallest and farthest away. Galileo saw this in 1610. So Venus must be going around the Sun, not around the Earth.

**The math:**
- Earth and Venus move on circles around the Sun, and their positions give the Earth-Venus distance `Δ` and Venus's apparent size `θ = 2 · arctan(Rᵥ / Δ)`.
- The angle at Venus between the Sun and the Earth (the phase angle `i`) gives how much of Venus we see lit: `k = (1 + cos i) / 2`.
- Both models on the page put Venus at the same distance from us at every moment, so the sizes match. The only difference is where the Sun is, and that alone decides the phase.

**What it does not prove:** a compromise model by Tycho Brahe (Venus goes around the Sun, but the Sun goes around the Earth) gives the same phases. Setting the Sun distance to 1 on the page shows this. The third page deals with it.

---

## 3. The Earth goes around the Sun (`orbit.html`)

**The claim being tested:** the Earth stands still and the Sun goes around it (the Earth-centred and Tycho models).

**In plain English:**
Walk through rain and it seems to fall at a slant toward you, even if it is falling straight down. The faster you walk, the bigger the slant. Starlight does the same thing. Because the Earth is moving, every star looks tilted slightly in the direction we are heading. Over a year, as we go around the Sun, our direction changes, so every star traces out a tiny loop in the sky. This is called the aberration of starlight, discovered by James Bradley in 1727.

The size of that loop is 20.5 arcseconds for every star, near or far. From that number we can work out how fast the Earth is moving: 29.8 km/s. That is exactly the speed needed to go around the Sun (150 million km away) once a year. Two completely different measurements give the same answer.

If the Earth stood still, the only way to get that loop would be for every star to move in its own circle, perfectly in step with the Sun. Stars farther than about 1,600 light-years would have to move faster than light to do it. The Andromeda Galaxy would need to move over 1,500 times faster than light. Nothing can do that, so the Earth must be the one moving.

**The math:**
- Light reaching a moving observer tilts by `κ = v / c`, so the measured 20.5″ gives `v = c · κ = 29.8 km/s`.
- A 1 AU orbit once a year gives `v = 2π · 1 AU / 365.25 days = 29.8 km/s`. The two match.
- Parallax, the small shift of nearby stars as we view them from different sides of the orbit, is `p = 1 AU / distance`. It peaks a quarter of a year after aberration, because one comes from where the Earth is and the other from how it is moving. That quarter-year gap is what an orbit produces.
- If the Earth is still, a star at distance `d` must circle at speed `2π · d · κ / 1 year`, which passes the speed of light beyond about 1,600 light-years.

---

## Notes

- Orbits are modelled as circles, and star distances and positions are rounded, so the numbers are close to real values but not exact.
- Everything runs in the browser with plain HTML, CSS and JavaScript. No install or build step is needed.
