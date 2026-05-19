const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();


const RESTAURANT_ID = "6441566a-b962-47e4-b6ae-416034115000";

const sentiments = ["positive", "neutral", "negative"];
const comments = [
  "Muy buena experiencia",
  "Todo correcto",
  "La comida estaba excelente",
  "Servicio mejorable",
  "Volveré sin duda",
  "No fue lo que esperaba",
];

const reviews = Array.from({ length: 1000 }, (_, i) => ({
  restaurant_id: RESTAURANT_ID,
  google_review_id: `manual_google_review_${crypto.randomUUID()}`,
  reviewer_name: `Usuario ${i + 1}`,
  rating: Math.floor(Math.random() * 5) + 1,
  comment: comments[Math.floor(Math.random() * comments.length)],
  language: "es",
  sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
  reply_status: "pending",
  reviewed_at: new Date(
    Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180
  ),
}));

async function main() {
  await prisma.reviews.createMany({
    data: reviews,
    skipDuplicates: true,
  });

  console.log("✅ 1000 reseñas creadas");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
