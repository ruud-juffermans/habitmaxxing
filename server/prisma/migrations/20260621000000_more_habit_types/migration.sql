-- Add two new habit value types:
--   duration_hours: a span entered as HH:MM, stored in value_num as decimal hours.
--   multi_boolean:  a tap-to-increment counter toward a target (e.g. 5 glasses),
--                   stored in value_num as the current count.
-- Both reuse value_num and are goal-scored like the other numeric types.
ALTER TYPE "HabitType" ADD VALUE 'duration_hours';
ALTER TYPE "HabitType" ADD VALUE 'multi_boolean';
