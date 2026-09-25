-- The group lesson answer pointed to a step of the booking form from outside it. Only the
-- original wording is replaced; an answer the club has edited stays as it is.
UPDATE "Faq"
SET "answer" = jsonb_set("answer", '{ro}', to_jsonb(replace("answer"->>'ro', 'Dacă vii singur și vrei să intri într-o grupă, scrie-ne la „Datele mele” sau intră pe lista de așteptare', 'Dacă vii singur și vrei să intri într-o grupă, scrie-ne din pagina de contact sau intră pe lista de așteptare')))
WHERE "answer"->>'ro' LIKE '%' || 'Dacă vii singur și vrei să intri într-o grupă, scrie-ne la „Datele mele” sau intră pe lista de așteptare' || '%';

UPDATE "Faq"
SET "answer" = jsonb_set("answer", '{en}', to_jsonb(replace("answer"->>'en', 'If you are on your own and want to join a group, tell us in “My details” or join the waiting list', 'If you are on your own and want to join a group, write to us from the contact page or join the waiting list')))
WHERE "answer"->>'en' LIKE '%' || 'If you are on your own and want to join a group, tell us in “My details” or join the waiting list' || '%';
