const core = require("@actions/core");
const github = require("@actions/github");

function sha(context) {
  if (context.payload && context.payload.pull_request) {
    return context.payload.pull_request.head.sha;
  } else {
    return context.sha;
  }
}

function metaLabels(context) {
  return [
    `org.opencontainers.image.created=${new Date().toISOString()}`,
    `org.opencontainers.image.description=${context.payload.repository.description || ""}`,
    `org.opencontainers.image.revision=${sha(context) || ""}`,
    `org.opencontainers.image.source=${context.payload.repository.html_url || ""}`,
    `org.opencontainers.image.title=${context.payload.repository.name || ""}`,
    `org.opencontainers.image.url=${context.payload.repository.html_url || ""}`,
  ];
}

function metaTags(repository, context, commit, isReleaseManaged) {
  var tags = [];

  tags.push(`${repository}:${commit}`);

  const isTagRef = context.ref.startsWith("refs/tags/");
  const isDefaultBranch = context.ref === `refs/heads/${context.payload.repository.default_branch}`;
  const shortSha = commit.substr(0, 7);

  if (isReleaseManaged) {
    if (isTagRef) {
      const tagName = context.ref.replace("refs/tags/", "");
      tags.push(`${repository}:release-${tagName}`);
      tags.push(`${repository}:latest`);
    } else {
      tags.push(`${repository}:dev-${shortSha}`);
    }
  } else {
    if (isDefaultBranch) {
      tags.push(`${repository}:release-${shortSha}`);
      tags.push(`${repository}:latest`);
    } else {
      tags.push(`${repository}:dev-${shortSha}`);
    }
  }

  // Append PR number
  if (context.payload && context.payload.pull_request) {
    tags.push(`${repository}:pr-${context.payload.pull_request.number}`);
  }

  return tags;
}

try {
  // Fetch inputs
  const repository = core.getInput("repository");
  const isReleaseManaged = core.getInput("release-managed") === "true";

  // Initialize context
  const labels = metaLabels(github.context);
  const tags = metaTags(repository, github.context, sha(github.context), isReleaseManaged);

  console.log(`Labels:\n  ${labels.join(`\n  `)}`);
  core.setOutput("labels", labels.join(`\n`));

  console.log(`Tags:\n  ${tags.join(`\n  `)}`);
  core.setOutput("tags", tags.join(`\n`));

  // Accessors
  console.log(`repositoryTag: ${tags[0]}`);
  core.setOutput("repositoryTag", tags[0]);
  console.log(`repository: ${repository}`);
  core.setOutput("repository", repository);
  console.log(`tag: ${sha(github.context)}`);
  core.setOutput("tag", sha(github.context));
} catch (error) {
  core.setFailed(error.message);
}
