#!/usr/bin/env bash
# Escreve o frontend/.env.
#   ./scripts/write-frontend-env.sh        -> modo aws, com as Function URLs dos Outputs da stack
#   ./scripts/write-frontend-env.sh mock   -> modo mock (sem backend)
set -euo pipefail

STACK_NAME="${STACK_NAME:-mini-kyc}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/frontend/.env"

if [[ "${1:-aws}" == "mock" ]]; then
  cat > "$ENV_FILE" <<ENV
VITE_API_MODE=mock
VITE_CREATE_VERIFICATION_URL=
VITE_LIST_VERIFICATIONS_URL=
ENV
  echo "frontend/.env no modo mock."
  exit 0
fi

output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

CREATE_URL=$(output CreateVerificationUrl)
LIST_URL=$(output ListVerificationsUrl)

if [[ -z "$CREATE_URL" || "$CREATE_URL" == "None" || -z "$LIST_URL" || "$LIST_URL" == "None" ]]; then
  echo "Não encontrei as Function URLs nos outputs da stack $STACK_NAME." >&2
  exit 1
fi

cat > "$ENV_FILE" <<ENV
VITE_API_MODE=aws
VITE_CREATE_VERIFICATION_URL=$CREATE_URL
VITE_LIST_VERIFICATIONS_URL=$LIST_URL
ENV
echo "frontend/.env apontando para a stack $STACK_NAME. Reinicie o npm run dev do frontend."
