import { Request, Response, Router } from 'express';
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: 'http://localhost:9200' });

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  const { id, name, email } = req.body;
  // if (!id || !name || !email) {
  //   return res.status(400).send('ID, name, and email are required');
  // }
  try {
    const exists = await esClient.exists({
      index: 'user_accounts',
      id
    });

    if (exists) {
      return res.status(400).send('Account with this ID already exists');
    }

    const account = { id, name, email };
    await esClient.index({
      index: 'user_accounts',
      body: account
    });

    res.status(201).send('Account created successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating account');
  }
});

export default router;
