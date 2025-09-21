import json
import boto3
import urllib.parse
import decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    path_params = event.get('pathParameters')

    if path_params and 'userId' in path_params:

        user_id = urllib.parse.unquote(path_params['userId'])
        response = table.get_item(Key={'userId': user_id})
        item = response.get('Item')

        if item:
            return build_response(200, item)
        else:
            return build_response(404, {'message': 'User not found'})
    else:
        # Fetch all users
        response = table.scan()
        users = response.get('Items', [])
        return build_response(200, users)