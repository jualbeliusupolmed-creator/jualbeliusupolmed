-- Link legacy Open PO records only when their campus label uniquely identifies
-- a university. General or ambiguous labels remain unlinked for manual review.
begin;

with unambiguous_matches as (
  select p.id as product_id, min(u.id) as university_id
  from public.open_po_products p
  join public.universities u
    on lower(trim(coalesce(p.campus, ''))) in (lower(u.id), lower(u.code), lower(u.name))
  where p.university_id is null
  group by p.id
  having count(distinct u.id) = 1
)
update public.open_po_products p
set university_id = m.university_id
from unambiguous_matches m
where p.id = m.product_id
  and p.university_id is null;

commit;
