# Pattern: Two Pointers

- Type: Algorithm
- Status: Proven
- Tags: arrays, optimization, linear-scan

## Use When

- Data is in a sequence and relative positions matter.
- You can move one or both ends to shrink search space.

## Avoid When

- Random access jumps dominate and pointer movement adds no pruning.

## Core Idea

Maintain two indices that move based on an invariant. At each step, eliminate impossible regions without revisiting all pairs.

## Complexity/Cost

- Time: Often `O(n)` after sort or on pre-ordered data.
- Space: `O(1)` extra (excluding sort cost).
- Implementation complexity: low to medium.

## Skeleton

```txt
left = 0
right = n - 1
while left < right:
  evaluate pair/state
  if condition too small: left += 1
  else: right -= 1
```

## Pitfalls

- Missing invariant definition before coding.
- Forgetting sort precondition when required.
