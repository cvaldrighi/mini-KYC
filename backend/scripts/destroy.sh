#!/usr/bin/env bash
# Apaga toda a stack do mini-KYC. O CloudFormation não apaga um bucket com arquivos
# (proteção contra perda de dados), então esvaziamos o bucket antes do `sam delete`.
set -euo pipefail

STACK_NAME="${STACK_NAME:-mini-kyc}"

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DocumentsBucketName'].OutputValue" \
  --output text)

if [[ -z "$BUCKET" || "$BUCKET" == "None" ]]; then
  echo "Não encontrei o bucket nos outputs da stack $STACK_NAME." >&2
  exit 1
fi

echo "Esvaziando s3://$BUCKET..."
aws s3 rm "s3://$BUCKET" --recursive

echo "Apagando a stack $STACK_NAME..."
sam delete --stack-name "$STACK_NAME"

# As Function URLs deixaram de existir: o frontend volta a funcionar sem backend.
"$(dirname "$0")/write-frontend-env.sh" mock
