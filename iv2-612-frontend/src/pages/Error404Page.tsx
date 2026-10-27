import { useNavigate } from "@tanstack/react-router";
import CascadeButton from "$src/components/button/button";
import RobotImage from "../assets/img/not_found/robot.png";
import { authStatus } from "../queries/auth";

export function Error404Page() {
	const navigate = useNavigate();

	const { isAuthenticated } = authStatus();

	return (
		<div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
			<div className=" flex items-center px-6 py-8">
				<img alt="not-found-robot" src={RobotImage} width={160} />
				<div className="space-y-4 ms-5">
					<p className="text-2xl font-normal text-gray-500">Oops!</p>
					<p className="text-4xl font-black text-gray-800">PAGE NOT FOUND</p>

					<p className="text-gray-600 dark:text-gray-400">
						The page you're looking for doesn't exist or has been moved.
					</p>

					{/* <div className='mt-8 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 rounded-md'>
            <p className='text-amber-700 dark:text-amber-400 font-medium'>
              Notice
            </p>
            <p className='text-amber-600 dark:text-amber-300 text-sm mt-1'>
              Currently, the application is only developed for users in the
              "management" group. Please try to login with a management user
              type.
            </p>
          </div> */}

					{isAuthenticated ? (
						<CascadeButton
							buttonText="Back to Home"
							handleOnClick={() => {
								navigate({ to: "/" });
							}}
							size="3"
						/>
					) : (
						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
							<CascadeButton
								buttonText="Go to Home"
								handleOnClick={() => navigate({ to: "/" })}
								size="3"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
