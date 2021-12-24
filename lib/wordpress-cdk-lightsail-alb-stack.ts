import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Peer, Port, SecurityGroup, Vpc} from "aws-cdk-lib/aws-ec2";
import {ApplicationLoadBalancer} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {IpTarget} from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import {aws_lightsail as lightsail} from "aws-cdk-lib";

export class WordpressCdkLightsailAlbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'WordPressVpc', {
      isDefault: true
    });

    const sg = new SecurityGroup(this, 'WordPressSG', {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: 'wordpress-sg'
    });
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    const instance = new lightsail.CfnInstance(this, 'WordPressLightsailInstance', {
      blueprintId: 'wordpress',
      bundleId: 'nano_2_0',
      instanceName: 'wordpress-lightsail',
      availabilityZone: 'ap-northeast-1a',
      userData: '#!/bin/bash\n' +
          'iptables -A INPUT -p tcp -s 172.31.0.0/16 --dport 80 -j ACCEPT\n' +
          'iptables -A INPUT -p tcp --dport 80 -j DROP\n' +
          'service iptables save'
    });
    const targets = [new IpTarget(instance.attrPrivateIpAddress, 80, 'all')];
    const alb = new ApplicationLoadBalancer(this, 'WordPressAlb', {
      vpc: vpc,
      internetFacing: true,
      loadBalancerName: 'wordpress-alb',
      securityGroup: sg,
    });
    const listener = alb.addListener('WordPressListener', {port: 80});
    listener.addTargets('WordPressTarget', {
      port: 80,
      targets: targets,
    });
  }
}
