---
title: "SageMakerエンドポイントを利用してモデル管理を調べた話"
date: 2024-08-03
slug: "sagemaker-endpoint-model-management"
aliases:
  - "/posts/2024/08/sagemakerエンドポイントを利用してモデルパッケージを/"
categories: 
  - "it"
tags: 
  - "sagemaker"
  - "サイノメ"
  - "モデルパッケージ"
cover:
  image: "images/sagemaker-endpoint-model-management-cover.png"
---

## AWSを使用してAIモデルを複数管理する方法

AWSを使用してAIのモデルを複数管理したいという話がありました。

学習済みのモデルなので本番では推論しか使われませんが、モデルのバージョン管理を行いたいということだったので調査をしました。

S3にモデルを置くだけでもある程度管理はできますが、SageMakerのエンドポイントを使うかもしれないということでSageMakerでの管理を調べることになりました。

基本的な書き方はサンプルの書き方に沿ってます。[こちら](https://docs.aws.amazon.com/ja_jp/sagemaker/latest/dg/model-registry-models.html)です。

## モデルのS3へのアップロード

まずはモデルをS3にアップロードするところからです。

```
# tensorflowを使うのでmodel.tar.gzにモデルを固める
TAR_DIR = './tmp' # 一時的なモデルディレクトリ
CODE_DIR = './code' # infarence.py等のディレクトリ
MODEL_DIR = './model' # モデルディレクトリ
TAR_NAME = os.path.join(TAR_DIR , 'model.tar.gz')
with tarfile.open(TAR_NAME, mode='w:gz') as tar
    tar.add(MODEL_DIR)
    tar.add(CODE_DIR)

# モデルをS3にアップロード(複数モデルをアップロードする想定)
s3_uri1 = sagemaker.session.Session(default_bucket='development').upload_data(
    path = TAR_NAME
    key_prefix = 'image_recognition/test/model1'
)
s3_uri2 = sagemaker.session.Session(default_bucket='development').upload_data(
    path = TAR_NAME
    key_prefix = 'image_recognition/test/model2'
)
```

## イメージの作成

モデルをアップロードしたら次はイメージの作成をします。イメージに関しては1イメージで複数モデル格納できますが、未調査のため一旦複数イメージを作成します。

```
image_uri1 = sagemaker.image_uris.retrieve(
    framework='tensorflow',
    region=sagemaker.session.Session().boto_region_name,
    version='2.12',
    instance_type='ml.m5.xlarge',
    image_scope=inference'
)
image_uri2 = sagemaker.image_uris.retrieve(
    framework='tensorflow',
    region=sagemaker.session.Session().boto_region_name,
    version='2.12',
    instance_type='ml.m5.xlarge',
    image_scope=inference'
)
```

## モデルパッケージグループの作成

モデルパッケージグループの作成をします。この中にモデルを複数入れることでバージョン管理を行っていきます。

```
model_package_group_name = 'test_model_group1'
client = boto3.client(sagemaker, region_name=sagemaker.session.Session().boto_region_name)
# チームごとのタグ付けもできますが今回は省きます
responce = client.create_model_package_group(
    ModelPackageGroupName=model_package_group_name, # モデルパッケージネーム
    ModelPackageGroupDescription='dev model package group' # モデルパッケージ説明文
)
```

## モデルパッケージの作成

モデルパッケージの作成をします。これをモデルパッケージグループに入れて管理していきます。

```
# モデルパッケージ1
model_package1 = {
    'InferenceSpecification': {
        'Containers': [
            {
              'Image': image_uri1,
              'ModelDataUrl': s3_uri1
            }
        ],
        'SupportedContentTypes': ['text/csv'],
        'SupportedResponseMIMETypes': ['text/csv'],
    }
}
model_package_dict1 = {
    'ModelPackageGroupName': model_package_group_name,
    'ModelPackageDescription': 'dev model package',
    'ModelApprovalStatus': 'Approved' # Approvedでなければ使用できないことに注意
}
model_package_dict1.update(model_package1)
model_package_response1 = cilent.create_model_package(**model_package_dict1)
model_package_arn1 = model_package_response1['ModelPackageArn']

# モデルパッケージ2
model_package2 = {
    'InferenceSpecification': {
        'Containers': [
            {
              'Image': image_uri2,
              'ModelDataUrl': s3_uri2
            }
        ],
        'SupportedContentTypes': ['text/csv'],
        'SupportedResponseMIMETypes': ['text/csv'],
    }
}
model_package_dict2 = {
    'ModelPackageGroupName': model_package_group_name,
    'ModelPackageDescription': 'dev model package',
    'ModelApprovalStatus': 'Approved' # Approvedでなければ使用できないことに注意
}
model_package_dict2.update(model_package2)
model_package_response2 = cilent.create_model_package(**model_package_dict2)
model_package_arn2 = model_package_response2['ModelPackageArn']
```

## モデルパッケージの確認

モデルパッケージグループにモデルパッケージが入ってるか確認します。使用できるか承認ステータスも確認しましょう。

```
# モデルパッケージ確認
import datetime
model_package_groups_list = client.list_model_package_groups(
    CreationTimeAfter=datetime.datetime(2024, 8, 1), # 作成日付以降を取得
    MaxResults=10 # 取得するモデルパッケージグループ数
)
print(model_package_groups_list)

model_package_list = client.list_model_package(
    CreationTimeAfter=datetime.datetime(2024, 8, 1), # 作成日付以降を取得
    MaxResults=10, # 取得するモデルパッケージグループ数
    ModelPackageGroupName=model_package_group_name # 取得するモデルパッケージグループ名
)
print(model_package_list)
```

私個人が使用するパラメータを設定しましたが、他にもどの名前が含まれているか？ソートはどうするか？承認ステータスはなにか？などがあります。

興味があれば[パッケージグループ](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker/client/list_model_package_groups.html)と[パッケージ](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker/client/list_model_packages.html)のドキュメントを確認してみてください。

## モデルの作成

次にモデルの作成を行います。

```
# 複数モデル作成
model_name1 = 'test_model1'
model_name2 = 'test_model2'
container_list1 = [{'ModelPackageName': model_package_arn1}]
container_list2 = [{'ModelPackageName': model_package_arn2}]

client.create_model(
    ModelName=model_name1,
    ExecutionRoleArn=sagemaker.get_execution_role(), # ロールの作成
    Containers=container_list1
)
client.create_model(
    ModelName=model_name2,
    ExecutionRoleArn=sagemaker.get_execution_role(), # ロールの作成
    Containers=container_list2
)
```

これで準備完了です。

## エンドポイントの設定

後はエンドポイントの設定をして、推論に使用するエンドポイントを切り替えれば大丈夫だと思います。

```
# エンドポイントコンフィグ設定
endpoint_config_name = 'test_endpoint_config'
client.create_endpoint_config{
    EndpointConfigName=endpoint_config_name,
    ProductionVariants=[{
        'VariantName': 'AllTraffic',
        'ModelName': model_name2, # 個々の指定を切り替える
        'InitialInstanceCount': 1,
        'InstanceType': 'ml.m5.2xlarge'
    }]
}

# エンドポイント作成
endpoint_name = 'test_endpoint'
client.create_endpoint(
    EndpointName=endpoint_name,
    EndpointConfigName=endpoint_config_name
)
```

## モデルパッケージやモデルパッケージグループの削除

最後に作成したモデルパッケージやモデルパッケージグループの削除を書いておきます。学習などをやると作りすぎることもあると思いますので。

モデルパッケージグループを削除する際はモデルパッケージを全て消さないと削除できないことをに注意してください。

```
# モデルパッケージ1削除
client.delete_model_package(
    'ModelPackageName': model_package_arn1
)

# モデルパッケージ2削除
client.delete_model_package(
    'ModelPackageName': model_package_arn2
)

# モデルグループ削除
client.delete_model_package_group(
    'ModelPackageGroupName': model_package_group_name
)
```

これで以上になります。

今はSageMaker StudioがあるのでGUIで手軽にできる気はしますが、コードのほうを覚えておくと良い面もあると思います。ではでは。
