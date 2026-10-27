import DecemberHolidayImage from "$src/assets/img/message_board/mb_december_holidays.png";
import GoldenDreamsImage from "$src/assets/img/message_board/mb_golden_dreams.jpg";
import LabourImage from "$src/assets/img/message_board/mb_labourday.jpg";
import MedicalImage from "$src/assets/img/message_board/mb_medical_checkup.jpg";
import PassportImage from "$src/assets/img/message_board/mb_passport.jpg";
import ShuttleImage from "$src/assets/img/message_board/mb_shuttle.jpg";

export const data = [
	{
		id: 655,
		user: 92505,
		username: "HR Department",
		avatar:
			"https://golden-dreams-prod-public.s3.amazonaws.com/media/images/avatars/Screenshot_20250511-002118.png",
		comments: [],
		reaction_counts: {
			comment_reaction_count: {
				total: 1,
				like: 1,
				love: 0,
				sad: 0,
			},
			reaction_type: "",
		},
		article: "New schedule for the shuttle bus!",
		file: ShuttleImage,
		filetype: "article",
		caption: null,
		posted: "2025-05-10T18:58:28.762759Z",
		comments_count: 0,
		language: 1,
		description:
			"We are extending the opperations of the shuttle bus for workers doing overtime. There will be buses operating at 4pm and 5pm. This service aims to provide greater convenience and ensure safe transportation for all staff. Please make use of the buses as needed and be at the pick-up point a few minutes before departure. Thank you for your continued hard work and dedication!",
	},
	{
		id: 594,
		user: 52327,
		username: "HR Department",
		avatar: null,
		comments: [],
		reaction_counts: {
			comment_reaction_count: {
				total: 2,
				like: 1,
				love: 1,
				sad: 0,
			},
			reaction_type: "",
		},
		article: "Passport collection for 90 days report",
		file: PassportImage,
		filetype: "article",
		caption: null,
		posted: "2025-02-26T09:00:26.504705Z",
		comments_count: 0,
		language: 1,
		description:
			"Please collect your passport for the 90 Days Report submission. This document is required for immigration reporting and must be submitted to the relevant authorities. Ensure you bring any supporting documents if applicable. Kindly collect your passport at the designated office during working hours.",
	},
	{
		id: 408,
		user: 51126,
		username: "HR Department",
		avatar: null,
		comments: [
			{
				id: 385,
				body: "Create a CV and then apply the jobs",
				user: {
					id: 19979,
					username: "Dar Dar Lay",
				},
				date: "2025-02-18T07:36:49.419241Z",
				parent_comment: null,
				child_comments: [],
			},
			{
				id: 438,
				body: "Okay, Thanks!",
				user: {
					id: 51126,
					username: "Tun Tun",
				},
				date: "2025-02-02T07:44:33.040229Z",
				parent_comment: null,
				child_comments: [],
			},
		],
		reaction_counts: {
			comment_reaction_count: {
				total: 0,
				like: 0,
				love: 0,
				sad: 0,
			},
			reaction_type: "",
		},
		article:
			"We are hiring: Share with your friends and colleagues how to apply through Golden Dreams!",
		file: GoldenDreamsImage,
		filetype: "article",
		caption: null,
		posted: "2024-12-10T07:31:39.325598Z",
		comments_count: 0,
		language: 1,
		description:
			"Golden Dreams is expanding our team and looking for passionate, talented individuals to join us! If you or someone you know is seeking a new opportunity, this is your chance.",
	},
	{
		id: 329,
		user: 84172,
		username: "HR Department",
		avatar: null,
		comments: [
			{
				id: 384,
				body: "Is Medical Check up free for all member?",
				user: {
					id: 19979,
					username: "dardar_lay",
				},
				date: "2024-11-18T07:36:33.417171Z",
				parent_comment: null,
				child_comments: [
					{
						id: 23,
						body: "Yes, It is.",
						user: {
							id: 23532,
							username: "mkkzmm@gmail.com",
						},
						date: "2024-06-17T04:20:27.964452Z",
						parent_comment: 22,
						child_comments: [],
					},
					{
						id: 24,
						body: "Free for all member!",
						user: {
							id: 23533,
							username: "mkkzmm@gmail.com",
						},
						date: "2024-06-17T04:20:27.964452Z",
						parent_comment: 22,
						child_comments: [],
					},
				],
			},
		],
		reaction_counts: {
			comment_reaction_count: {
				total: 2,
				like: 1,
				love: 2,
				sad: 0,
			},
			reaction_type: "",
		},
		article:
			"The free annual medical check up will be taking place on Tuesday, July 29th, 2025.",
		file: MedicalImage,
		filetype: "article",
		caption: null,
		posted: "2024-10-22T06:31:20.257954Z",
		comments_count: 3,
		language: 1,
		description:
			"The free annual medical check-up will take place on Tuesday, July 29th, 2025. All eligible participants are encouraged to attend for a comprehensive health screening. This check-up includes basic health assessments and is provided at no cost. Please bring your ID or employee badge and arrive on time. Further details regarding the location and schedule will be shared soon.",
	},
	{
		id: 307,
		user: 52327,
		username: "HR Department",
		avatar: null,
		comments: [
			{
				id: 385,
				body: "Have fun!",
				user: {
					id: 19979,
					username: "Samantha",
				},
				date: "2024-11-18T07:36:49.419241Z",
				parent_comment: null,
				child_comments: [],
			},
			{
				id: 438,
				body: "Congratulations!",
				user: {
					id: 51126,
					username: "Liezel",
				},
				date: "2024-12-02T07:44:33.040229Z",
				parent_comment: null,
				child_comments: [],
			},
		],
		reaction_counts: {
			comment_reaction_count: {
				total: 1,
				like: 0,
				love: 1,
				sad: 0,
			},
			reaction_type: "",
		},
		article: "Happy Labor Day!",
		file: LabourImage,
		filetype: "article",
		caption: null,
		posted: "2024-10-11T08:29:09.210838Z",
		comments_count: 2,
		language: 1,
		description:
			"Wishing everyone a restful and joyful Labor Day! Today, we celebrate the hard work, dedication, and contributions of all workers. May you take this time to relax, recharge, and enjoy the day with friends and family. Thank you for all that you do!",
	},
	{
		id: 37,
		user: 81851,
		username: "HR Department",
		avatar: null,
		comments: [
			{
				id: 16,
				body: "Will you come from SMSK?",
				user: {
					id: 17801,
					username: "myamarlaroo_issara",
				},
				date: "2024-07-09T06:42:52.629773Z",
				parent_comment: null,
				child_comments: [],
			},
			{
				id: 78,
				body: "Hello ",
				user: {
					id: 75514,
					username: "rk7633768@gmail.com",
				},
				date: "2024-07-24T09:29:42.092305Z",
				parent_comment: null,
				child_comments: [],
			},
			{
				id: 386,
				body: "https://maps.app.goo.gl/1Bed7JREa8oChrhUA",
				user: {
					id: 19979,
					username: "dardar_lay",
				},
				date: "2024-11-18T07:37:20.162910Z",
				parent_comment: null,
				child_comments: [],
			},
		],
		reaction_counts: {
			comment_reaction_count: {
				total: 2,
				like: 1,
				love: 1,
				sad: 0,
			},
			reaction_type: "",
		},
		article: "Next year official holidays!",
		file: DecemberHolidayImage,
		filetype: "article",
		caption: null,
		posted: "2024-07-09T06:41:33.821697Z",
		comments_count: 3,
		language: 1,
		description:
			"We’re pleased to share the list of official public holidays for the year 2024. Please take note of these dates for your planning and travel arrangements. These holidays will be observed in accordance with government regulations. A full calendar will be made available shortly—stay tuned for more updates! Wishing everyone a productive and well-balanced year ahead!",
	},
];
