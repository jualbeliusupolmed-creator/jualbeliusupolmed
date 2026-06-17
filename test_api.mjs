async function test() {
  const payload = {
    seller_name: "Test Agent",
    seller_wa: "62895429126232",
    title: "Barang Test",
    description: "Testing API",
    price: 10000,
    stock: 1,
    category: "Elektronik",
    type: "barang",
    campus: "Semua",
    area: "Medan"
  };

  try {
    const res = await fetch("https://jualbeliusupolmed.vercel.app/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("STATUS:", res.status);
    console.dir(data, { depth: null });
  } catch (err) {
    console.error(err);
  }
}
test();
