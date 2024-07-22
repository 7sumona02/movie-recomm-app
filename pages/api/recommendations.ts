// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import Movie from "@/movie";
import type { NextApiRequest, NextApiResponse } from "next";
const {readFileSync} = require('fs');
const pg = require('pg');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

const config = {
  user: process.env.PG_NAME,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: "defaultdb",
  ssl: {
      rejectUnauthorized: true,
      ca: readFileSync('./certificates/ca.pem').toString(),
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Movie[]>
) {
  const model = await use.load();
  const embeddingsRequest = await model.embed(req.body.search);
  const embedding = embeddingsRequest.arraySync()[0];
  const client = new pg.Client(config);
  await client.connect();

  try {
      const pgResponse = await client.query(`SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embedding)}' LIMIT 5;`);
      res.status(200).json(pgResponse.rows)
  } catch (err) {
      console.error(err);
  } finally {
      await client.end()
  }
}