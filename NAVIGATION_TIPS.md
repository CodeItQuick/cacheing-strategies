# Navigation Tips

---

## If you just want general knowledge

**1. Start with the Key Difference table at the bottom of `README.md`**
It answers the single most important orienting question in four rows: what is a cache for, what is a buffer for, and how they differ in data reuse, lifetime, and access pattern. Read this before anything else.

**2. Skim the three buffering sections and two caching sections in `README.md`**
Don't read the implementation detail — just read the section headings and the *Description* column of each table. This gives you a mental map of all the named strategies that exist and how the space is carved up: caching splits into population strategies and eviction policies; buffering splits into flush trigger, structure, and write behaviour.

**3. Read `use_cases/use_cases_summary.md` top to bottom**
The opening table tells you what kind of problem each section addresses in one sentence. The strategy-by-strategy summaries below it give you the one-paragraph distillation of each strategy without any examples — enough to recognise whether a strategy is familiar or foreign without having to read 25 use cases.

---

## If you have a specific problem to solve

**1. Decide: cache or buffer?**
Read the Key Difference table at the bottom of `README.md`. Ask: is this data being reused on repeated reads (cache), or is this about smoothing a speed mismatch between a producer and a consumer (buffer)? Pick a side.

**2. If caching — decide: population or eviction?**
Ask: is my problem about how data gets in and stays fresh, or about what gets dropped when the cache is full? If fresh/consistent — go to population strategies. If bounded memory — go to eviction policies. The opening table in `use_cases/use_cases_summary.md` has one-line descriptions for both.

**3. If buffering — decide: flush trigger, structure, or write behaviour?**
Use the opening table in `use_cases/use_cases_summary.md` to identify which dimension your problem lives in. Flush trigger if the question is *when does the batch go out*. Structure if a plain array breaks down for your use case. Write behaviour if the question is about what the act of writing promises the caller.

**4. Open the relevant use cases file in `use_cases/`**
Read the framing note at the top of each section — the paragraph before the numbered examples. If the commonality described matches your situation, you're in the right place. If it doesn't, you're in the wrong section and should go back to step 2 or 3.

**5. Read the numbered examples in that section only**
Find the one or two that most closely match your problem. The `src/` implementations linked from `README.md` are the reference code; the use cases files are the decision guide. You don't need to read across sections unless your problem genuinely has two dimensions (e.g. you need both a flush trigger *and* a structural constraint — in which case the structure choice is usually made first, then the flush trigger layered on top).
