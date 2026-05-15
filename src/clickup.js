import axios from "axios";

const BASE = "https://api.clickup.com/api/v2";

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: token, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

export async function createFolder({ token, spaceId, name }) {
  const api = client(token);
  const { data } = await api.post(`/space/${spaceId}/folder`, { name });
  return data;
}

export async function createList({ token, folderId, name, content }) {
  const api = client(token);
  const body = { name };
  if (content) body.content = content;
  const { data } = await api.post(`/folder/${folderId}/list`, body);
  return data;
}

export async function createTask({ token, listId, task }) {
  const api = client(token);
  const { data } = await api.post(`/list/${listId}/task`, task);
  return data;
}

export async function replicateTemplate({ token, spaceId, clientName, template }) {
  const folder = await createFolder({ token, spaceId, name: clientName });

  const results = { folder, lists: [] };
  for (const listSpec of template.lists ?? []) {
    const list = await createList({
      token,
      folderId: folder.id,
      name: listSpec.name,
      content: listSpec.content,
    });
    const tasks = [];
    for (const t of listSpec.tasks ?? []) {
      const created = await createTask({ token, listId: list.id, task: t });
      tasks.push({ id: created.id, name: created.name });
    }
    results.lists.push({ id: list.id, name: list.name, tasks });
  }
  return results;
}
