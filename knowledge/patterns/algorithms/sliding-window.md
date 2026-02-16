# Pattern: Sliding Window

- Type: Algorithm
- Status: Proven
- Tags: strings, arrays, subarray, streaming

## Use When

- You need best/valid contiguous segment.
- Constraint can be updated incrementally as window moves.

## Avoid When

- Validity requires global recomputation each move.

## Core Idea

Track a window `[left, right]` and maintain incremental state (counts/sum/etc). Expand to include candidates, shrink until constraints are valid, and update answer per invariant.

## Complexity/Cost

- Time: Typically `O(n)`.
- Space: `O(k)` for tracked state.
- Implementation complexity: medium.

## Skeleton

```txt
left = 0
for right in range(n):
  add item(right)
  while invalid:
    remove item(left)
    left += 1
  update answer
```

## Pitfalls

- Using non-monotonic constraint with naive shrink loop.
- Updating answer before restoring validity.
