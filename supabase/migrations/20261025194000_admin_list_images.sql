-- Storage needs a select rule to find files before deleting or replacing them.
-- The bucket stays public for viewing images by URL; only admins can list it.
create policy "Admins list product images" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
